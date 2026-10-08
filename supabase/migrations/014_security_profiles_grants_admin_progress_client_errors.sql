-- 1) profiles: innloggede kunne PATCHe egen `role` (→ owner) via PostgREST,
--    fordi UPDATE var gitt på alle kolonner og policyen bare krever egen rad.
--    UPDATE begrenses til kolonnene appen faktisk skriver. Rolleendring går
--    via edge-funksjonen manage-user (service_role) og påvirkes ikke.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name, wants_newsletter, installed_app_at, newsletter_in_mailing_list)
  ON public.profiles TO authenticated;

-- 2) user_progress hadde bare «egen rad»-policy; Admin-statistikken (kjønn/alder)
--    så derfor kun adminens egen rad.
DROP POLICY IF EXISTS user_progress_admin_select ON public.user_progress;
CREATE POLICY user_progress_admin_select ON public.user_progress
  FOR SELECT USING ((SELECT public.is_admin()));

-- 3) client_errors kan skrives av anonyme: begrens størrelse (NOT VALID så
--    gamle rader ikke sjekkes) og rydd rader eldre enn 30 dager ukentlig.
ALTER TABLE public.client_errors DROP CONSTRAINT IF EXISTS client_errors_size_check;
ALTER TABLE public.client_errors ADD CONSTRAINT client_errors_size_check CHECK (
  length(coalesce(context, '')) <= 100
  AND length(coalesce(message, '')) <= 1000
  AND length(coalesce(user_agent, '')) <= 500
  AND length(coalesce(url, '')) <= 500
  AND octet_length(coalesce(extra::text, '')) <= 4000
) NOT VALID;
SELECT cron.schedule(
  'cleanup-client-errors',
  '30 3 * * 0',
  $$DELETE FROM public.client_errors WHERE created_at < now() - interval '30 days'$$
);
