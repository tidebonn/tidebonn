import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function lookupViaIpApi(ip: string) {
  const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,message`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.status !== "success") return null;
    return { country: d.country ?? null, country_code: d.countryCode ?? null, city: d.city ?? null, provider: "ip-api" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function lookupViaAbstract(ip: string, apiKey: string) {
  const url = `https://ip-geolocation.abstractapi.com/v1/?api_key=${apiKey}&ip_address=${encodeURIComponent(ip)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const d = await res.json();
    return { country: d.country ?? null, country_code: d.country_code ?? null, city: d.city ?? null, provider: "abstract" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ipHeader = req.headers.get("x-forwarded-for")
      || req.headers.get("x-real-ip")
      || req.headers.get("cf-connecting-ip");

    if (!ipHeader) {
      return json({ country: null, city: null, error: "no-ip" });
    }

    const ip = ipHeader.split(",")[0].trim();

    // Prøv ip-api.com først (gratis, ingen nøkkel)
    const ipApiResult = await lookupViaIpApi(ip);
    if (ipApiResult && ipApiResult.country) {
      return json(ipApiResult);
    }

    // Fallback: AbstractAPI hvis nøkkel finnes
    const abstractKey = Deno.env.get("ABSTRACT_API_KEY");
    if (abstractKey) {
      const abstractResult = await lookupViaAbstract(ip, abstractKey);
      if (abstractResult && abstractResult.country) {
        return json(abstractResult);
      }
    }

    return json({ country: null, city: null, error: "all-providers-failed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ country: null, city: null, error: msg });
  }
});
