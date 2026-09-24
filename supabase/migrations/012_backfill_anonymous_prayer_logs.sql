-- Anonyme lesninger 2026-05-27 → 2026-09-24 feilet med RLS fordi klienten
-- gjorde insert+select (RETURNING krever SELECT-policy). Feilene ble logget
-- i client_errors med prayer_id og tidspunkt; her rekonstrueres radene.
-- Varighet for "fullført" anslås fra parret "påbegynt"-feil (samme bønn og
-- user_agent, ≤3 t før), slik appen selv regner: max(1, round(min siden åpning)).
-- Uparrede fullførte får medianen. Idempotent via NOT EXISTS.
WITH e AS (
  SELECT id, context, created_at, (extra->>'prayer_id')::uuid AS prayer_id, user_agent
  FROM public.client_errors
  WHERE context IN ('prayer_log_insert_start','prayer_log_insert_fast_start','prayer_log_insert_complete')
    AND message LIKE 'new row violates row-level security%'
),
starts AS (SELECT * FROM e WHERE context <> 'prayer_log_insert_complete'),
completes AS (SELECT * FROM e WHERE context = 'prayer_log_insert_complete'),
paired AS (
  SELECT c.prayer_id, c.created_at,
         GREATEST(1, ROUND((EXTRACT(EPOCH FROM (c.created_at - s.created_at)) + 5) / 60))::int AS est_minutes
  FROM completes c
  LEFT JOIN LATERAL (
    SELECT s.created_at FROM starts s
    WHERE s.prayer_id = c.prayer_id AND s.user_agent IS NOT DISTINCT FROM c.user_agent
      AND s.created_at <= c.created_at AND s.created_at >= c.created_at - interval '3 hours'
    ORDER BY s.created_at DESC LIMIT 1
  ) s ON true
),
fallback AS (
  SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY est_minutes))::int AS median_minutes
  FROM paired WHERE est_minutes IS NOT NULL
),
rows_to_insert AS (
  SELECT prayer_id, created_at, false AS completed, 0 AS duration_minutes FROM starts
  UNION ALL
  SELECT p.prayer_id, p.created_at, true, COALESCE(p.est_minutes, f.median_minutes)
  FROM paired p CROSS JOIN fallback f
)
INSERT INTO public.prayer_logs
  (user_id, prayer_id, series_id, day, time_of_day, duration_minutes, completed, created_at)
SELECT NULL, r.prayer_id, pr.series_id, pr.day, pr.time_of_day, r.duration_minutes, r.completed, r.created_at
FROM rows_to_insert r
JOIN public.prayers pr ON pr.id = r.prayer_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.prayer_logs pl
  WHERE pl.user_id IS NULL AND pl.prayer_id = r.prayer_id
    AND pl.created_at = r.created_at AND pl.completed = r.completed
);
