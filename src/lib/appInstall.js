// Helper for å oppdage og logge PWA-installasjon.
// Når appen kjøres i standalone-modus («hjemmeskjerm-app»), antar
// vi at den er installert som PWA. Vi setter da profiles.installed_app_at
// for den innloggede brukeren første gang vi ser dette — så admin
// kan telle hvor mange registrerte brukere som har lastet ned appen.

import { sb } from '@/api/client';

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  try {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    if (mq && mq.matches) return true;
  } catch {}
  // iOS Safari bruker navigator.standalone (legacy)
  if (window.navigator && window.navigator.standalone === true) return true;
  return false;
}

export async function markInstalledIfNeeded(userId) {
  if (!userId) return;
  if (!isStandalone()) return;
  try {
    // Sjekk om allerede satt
    const { data, error: selErr } = await sb
      .from('profiles')
      .select('installed_app_at')
      .eq('id', userId)
      .maybeSingle();
    if (selErr) return;
    if (data?.installed_app_at) return;
    // Sett tidsstempelet — feiler stille om RLS nekter
    await sb
      .from('profiles')
      .update({ installed_app_at: new Date().toISOString() })
      .eq('id', userId);
  } catch {
    // Stilt — dette er observasjonell logging, ikke kritisk for app-flyten
  }
}
