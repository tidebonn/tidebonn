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
  sekst: "Middagsbønn",
  non: "Non",
  vesper: "Vesper",
  kompletorium: "Kompletorium",
};

const GREETINGS: Record<string, string> = {
  matutin: "Vekk din sjel — det er tid for matutin.",
  laudes: "God morgen — det er tid for laudes.",
  prim: "Den nye dagen begynner — det er tid for prim.",
  ters: "Et øyeblikks pust — det er tid for ters.",
  sekst: "Det er midt på dagen — tid for middagsbønn.",
  non: "Ettermiddagens stille bønn — tid for non.",
  vesper: "Kvelden faller — det er tid for vesper.",
  kompletorium: "Dagen avsluttes — tid for kompletorium.",
};

// =============================================================
// Bønnedøgn-helpers (speiler src/components/prayer/PrayerSeriesCycleUtils.jsx)
// =============================================================

const SLOT_START_HOURS: Record<string, number> = {
  matutin: 2, laudes: 6, prim: 6.5, ters: 9,
  sekst: 12, non: 15, vesper: 18, kompletorium: 21,
};

const START_DAY_MAP: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 0,
};

// 0 = «head»-tid (samme kalenderdag som bønnedøgnet starter),
// 1 = «tail»-tid (neste kalenderdag).
function calendarOffsetWithinBonnedogn(timeOfDay: string, startTime: string): number {
  const t = SLOT_START_HOURS[timeOfDay] ?? 0;
  const s = SLOT_START_HOURS[startTime] ?? 0;
  return t >= s ? 0 : 1;
}

function getSeriesAnchor(series: any): Date | null {
  if (!series?.series_start_date) return null;
  const startTime = series.start_time || "laudes";
  const startDayJs = START_DAY_MAP[series.start_day || "saturday"];
  const startTimeHour = SLOT_START_HOURS[startTime] ?? 0;

  const seriesStartDate = new Date(series.series_start_date);
  seriesStartDate.setHours(0, 0, 0, 0);
  const dayOfWeekOfStart = seriesStartDate.getDay();
  const daysToStartDay = (startDayJs - dayOfWeekOfStart + 7) % 7;

  const anchor = new Date(seriesStartDate);
  anchor.setDate(anchor.getDate() + daysToStartDay);
  const startHourInt = Math.floor(startTimeHour);
  const startMinutes = Math.round((startTimeHour - startHourInt) * 60);
  anchor.setHours(startHourInt, startMinutes, 0, 0);
  return anchor;
}

function getCycleLength(series: any): number {
  return series?.sort_by === "weeks"
    ? (series.total_weeks || 4) * 7
    : (series.total_days || 30);
}

// For en gitt kalenderdato (lokalt dato-objekt), hvilke to bønnedøgn-numre
// bidrar? morningBonnedogn ender ved start_time denne dagen; eveningBonnedogn
// starter ved start_time denne dagen. Wraparound via modulo.
function bonnedognerForCalendarDay(
  series: any,
  calendarDate: Date,
): { morningBonnedogn: number; eveningBonnedogn: number } {
  const anchor = getSeriesAnchor(series);
  const cycleLength = getCycleLength(series);
  if (!anchor) return { morningBonnedogn: cycleLength, eveningBonnedogn: 1 };

  const eveningStart = new Date(calendarDate);
  eveningStart.setHours(
    anchor.getHours(),
    anchor.getMinutes(),
    anchor.getSeconds(),
    anchor.getMilliseconds(),
  );

  const elapsedDays = Math.round(
    (eveningStart.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24),
  );
  const eveningPos = ((elapsedDays % cycleLength) + cycleLength) % cycleLength;
  const eveningBonnedogn = eveningPos + 1;
  const morningPos = ((eveningPos - 1) % cycleLength + cycleLength) % cycleLength;
  const morningBonnedogn = morningPos + 1;
  return { morningBonnedogn, eveningBonnedogn };
}

// Returnerer hvilket bønnedøgn-nummer den gitte (kalenderdato, time_of_day)
// hører til. Brukt for å slå opp riktig bønne-rad i DB for et push-varsel.
function resolveBonnedognForCalendarTime(
  series: any,
  calendarDate: Date,
  timeOfDay: string,
): number {
  const { morningBonnedogn, eveningBonnedogn } =
    bonnedognerForCalendarDay(series, calendarDate);
  const offset = calendarOffsetWithinBonnedogn(timeOfDay, series.start_time || "laudes");
  return offset === 1 ? morningBonnedogn : eveningBonnedogn;
}

// =============================================================
// Tid + datohjelpere (Oslo-tid)
// =============================================================

function currentOsloTime(now: Date): { hhmm: string; date: string } {
  const fmt = new Intl.DateTimeFormat("nb-NO", {
    timeZone: TZ,
    hour: "2-digit", minute: "2-digit",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return {
    hhmm: `${parts.hour}:${parts.minute}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

// Bygg en Date som tilsvarer Oslo-tid midnatt for kalenderdatoen.
function osloMidnightDate(yyyymmdd: string): Date {
  // Vi tolker datoen som lokal i Oslo. UTC-offsett kan variere; bruk
  // en faste timer-hack: opprett som UTC kl 12 så vi unngår DST-glipp,
  // og normaliser til lokal midnatt for kalenderberegningen som ikke
  // bryr seg om timer-presisjon (kun dagen).
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// =============================================================
// Edge function
// =============================================================

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
  const calendarDate = osloMidnightDate(date);

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

  // Hent alle aktive serier en gang så vi unngår per-bruker-roundtrip.
  const { data: allSeries } = await supabase
    .from("prayer_series")
    .select("id, title, start_day, start_time, series_start_date, sort_by, total_weeks, total_days, is_active")
    .eq("is_active", true);
  const seriesById = new Map<string, any>(
    (allSeries || []).map((s: any) => [s.id, s]),
  );
  const defaultSeriesId = (allSeries && allSeries[0]?.id) as string | undefined;

  let sent = 0;
  let removed = 0;
  let skippedNoPrayer = 0;

  for (const pref of pending) {
    // Finn brukerens aktive serie. Faller tilbake til første aktive
    // serie hvis user_progress mangler.
    const { data: progressRows } = await supabase
      .from("user_progress")
      .select("current_series_id")
      .eq("user_id", pref.user_id)
      .limit(1);
    const userSeriesId =
      (progressRows && progressRows[0]?.current_series_id) || defaultSeriesId;
    const series = userSeriesId ? seriesById.get(userSeriesId) : null;
    if (!series) {
      skippedNoPrayer++;
      continue;
    }

    // Hvilken bønnedøgn-rad skal denne pref'en lande på?
    const bonnedognN = resolveBonnedognForCalendarTime(
      series,
      calendarDate,
      pref.time_of_day,
    );

    // Sjekk at en bønn finnes for (serie, bønnedøgn, tid) før vi sender.
    const { data: prayerRows } = await supabase
      .from("prayers")
      .select("id, title")
      .eq("series_id", series.id)
      .eq("day", bonnedognN)
      .eq("time_of_day", pref.time_of_day)
      .eq("is_active", true)
      .is("deleted_at", null)
      .limit(1);

    if (!prayerRows || prayerRows.length === 0) {
      // Ingen bønn for denne kombinasjonen — hopp over, men marker som
      // sendt så vi ikke prøver om igjen senere samme dag.
      await supabase
        .from("push_preferences")
        .update({ last_sent_date: date })
        .eq("id", pref.id);
      skippedNoPrayer++;
      continue;
    }

    // Hent subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", pref.user_id);
    if (!subs || subs.length === 0) {
      await supabase
        .from("push_preferences")
        .update({ last_sent_date: date })
        .eq("id", pref.id);
      continue;
    }

    const title = TIME_LABELS[pref.time_of_day] || "Tidebønn";
    const body = GREETINGS[pref.time_of_day] || "Tid for bønn.";
    const url = `${APP_URL}/Prayers?day=${bonnedognN}&time=${pref.time_of_day}&open=1`;
    const payload = JSON.stringify({ title, body, url, tag: pref.time_of_day });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else {
          console.error("push-feil:", e?.message || e);
        }
      }
    }

    await supabase
      .from("push_preferences")
      .update({ last_sent_date: date })
      .eq("id", pref.id);
  }

  return new Response(
    JSON.stringify({
      checked: hhmm, date,
      pending: pending.length,
      sent, removed, skippedNoPrayer,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
