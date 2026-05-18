import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method-not-allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "no-auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verifiser caller JWT og hent rolle
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (callerProfile?.role !== "owner") {
      return json({ error: "only-owner" }, 403);
    }

    const { action, targetUserId, newRole } = await req.json();
    if (!action || !targetUserId) return json({ error: "missing-params" }, 400);
    if (targetUserId === userData.user.id) {
      return json({ error: "cannot-modify-self" }, 400);
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role, email")
      .eq("id", targetUserId)
      .single();
    if (!targetProfile) return json({ error: "target-not-found" }, 404);

    // Eier kan ikke endre annen eier (det må gjøres direkte i DB)
    if (targetProfile.role === "owner") {
      return json({ error: "cannot-modify-owner" }, 403);
    }

    if (action === "set-role") {
      if (newRole !== "user" && newRole !== "admin") {
        return json({ error: "invalid-role" }, 400);
      }
      const { error: updErr } = await admin
        .from("profiles")
        .update({ role: newRole })
        .eq("id", targetUserId);
      if (updErr) return json({ error: updErr.message }, 500);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
      if (delErr) return json({ error: delErr.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "unknown-action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ error: msg }, 500);
  }
});
