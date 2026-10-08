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

// user er objektet fra db.auth.me(), som allerede inneholder installed_app_at.
export async function markInstalledIfNeeded(user) {
  if (!user?.id || user.installed_app_at) return;
  if (!isStandalone()) return;
  try {
    // Sett tidsstempelet — feiler stille om RLS nekter
    await sb
      .from('profiles')
      .update({ installed_app_at: new Date().toISOString() })
      .eq('id', user.id);
  } catch {
    // Stilt — dette er observasjonell logging, ikke kritisk for app-flyten
  }
}
