// Lesninger av samme bønn som starter innen GROUP_GAP_MS etter forrige
// regnes som én samling. Anonyme rader kan ikke skilles fra hverandre,
// så hver anonym start telles som én leser — tallene er et anslag.
export const GROUP_GAP_MS = 5 * 60 * 1000;

export function detectGroupSessions(logs, { gapMs = GROUP_GAP_MS } = {}) {
  const starts = logs
    .filter((l) => l.completed === false)
    .map((l) => ({ ...l, t: new Date(l.created_at).getTime() }))
    .filter((l) => !Number.isNaN(l.t))
    .sort((a, b) => a.t - b.t);

  const byPrayer = new Map();
  for (const l of starts) {
    const key = l.prayer_id || `${l.series_id}|${l.day}|${l.time_of_day}`;
    if (!byPrayer.has(key)) byPrayer.set(key, []);
    byPrayer.get(key).push(l);
  }

  const sessions = [];
  for (const rows of byPrayer.values()) {
    let current = null;
    for (const l of rows) {
      if (!current || l.t - current.lastT > gapMs) {
        current = { rows: [], firstT: l.t, lastT: l.t };
        sessions.push(current);
      }
      current.rows.push(l);
      current.lastT = l.t;
    }
  }

  return sessions
    .map((s) => {
      const loggedIn = new Set(s.rows.filter((r) => r.user_id).map((r) => r.user_id)).size;
      const anonymous = s.rows.filter((r) => !r.user_id).length;
      const { series_id, day, time_of_day } = s.rows[0];
      return {
        startedAt: new Date(s.firstT),
        endedAt: new Date(s.lastT),
        series_id,
        day,
        time_of_day,
        readings: s.rows.length,
        loggedIn,
        anonymous,
        size: loggedIn + anonymous,
      };
    })
    .sort((a, b) => b.startedAt - a.startedAt);
}
