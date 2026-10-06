-- Push-jobben hvert 10. minutt i stedet for hvert minutt: 90 % færre
-- HTTP-kall, pg_net-svar og cron-historikk. Funksjonen send-pending-pushes
-- sender nå alt som er forfalt (< 30 min) siden forrige kjøring.
SELECT cron.alter_job(job_id => 1, schedule => '*/10 * * * *');

-- Eksisterende varslingstider rundes til nærmeste 10 minutter (UI tillater
-- nå bare det). time + interval wrapper ved midnatt (23:56 → 00:00).
UPDATE public.push_preferences
SET notify_at = time '00:00' + make_interval(mins => (round(extract(epoch FROM notify_at) / 600) * 10)::int)
WHERE extract(minute FROM notify_at)::int % 10 <> 0 OR extract(second FROM notify_at) <> 0;

-- Ukentlig opprydding av cron-historikk (Supabase-anbefaling; tabellen var 130 MB).
SELECT cron.schedule(
  'cleanup-cron-history',
  '0 3 * * 0',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);
