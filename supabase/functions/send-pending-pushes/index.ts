// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const APP_URL = Deno.env.get("APP_URL") || "https://tidebonn.no";
const TZ = "Europe/Oslo";

const TIME_LABELS: Record<string, string> = {
  matutin: "Matutin",
  laudes: "Laudes",
  prim: "Prim",
  ters: "Ters",
  sekst: "Sekst",
  non: "Non",
  vesper: "Vesper",
  kompletorium: "Kompletorium",
};

const GREETINGS: Record<string, string> = {
  matutin: "Vekk din sjel — det er tid for matutin.",
  laudes: "God morgen — det er tid for laudes.",
  prim: "Den nye dagen begynner — det er tid for prim.",
  ters: "Et øyeblikks pust — det er tid for ters.",
  sekst: "Det er midt på dagen — tid for sekst.",
  non: "Ettermiddagens stille bønn — tid for non.",
  vesper: "Kvelden faller — det er tid for vesper.",
  kompletorium: "Dagen avsluttes — tid for kompletorium.",
};

// Gjør (HH, MM) i Oslo om til "HH:MM"
function currentOsloTime(now: Date): { hhmm: string; date: string } {
  const fmt = new Intl.DateTimeFormat("nb-NO", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    hhmm: `${parts.hour}:${parts.minute}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") || "mailto:admin@tidebonn.no",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const now = new Date();
  const { hhmm, date } = currentOsloTime(now);

  // Finn brukere som skal ha varsel på akkurat dette minuttet og som
  // ikke allerede er varslet i dag for denne bønnetiden.
  const { data: pending, error: prefErr } = await supabase
    .from("push_preferences")
    .select("id, user_id, time_of_day, notify_at")
    .eq("enabled", true)
    .filter("notify_at", "eq", `${hhmm}:00`)
    .or(`last_sent_date.is.null,last_sent_date.lt.${date}`);

  if (prefErr) {
    return new Response(JSON.stringify({ error: prefErr.message }), { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ checked: hhmm, sent: 0 }), { status: 200 });
  }

  let sent = 0;
  let removed = 0;

  for (const pref of pending) {
    // Hent alle subscriptions for brukeren
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", pref.user_id);

    if (!subs || subs.length === 0) continue;

    const title = TIME_LABELS[pref.time_of_day] || "Tidebønn";
    const body = GREETINGS[pref.time_of_day] || "Tid for bønn.";
    const url = `${APP_URL}/Prayers?time=${pref.time_of_day}&open=1`;
    const payload = JSON.stringify({ title, body, url, tag: pref.time_of_day });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        // 404/410 = endpoint expired, fjern
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else {
          console.error("push-feil:", e?.message || e);
        }
      }
    }

    // Marker som sendt i dag for denne brukeren+bønnetiden
    await supabase
      .from("push_preferences")
      .update({ last_sent_date: date })
      .eq("id", pref.id);
  }

  return new Response(
    JSON.stringify({ checked: hhmm, date, pending: pending.length, sent, removed }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
