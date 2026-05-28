import { useEffect, useState } from 'react';

// Telefon = liten berøringsskjerm. To kriterier som MÅ stemme overens
// med CSS-terskelen i PrayerContent (orientation: landscape) and
// (max-height: 600px):
//
//   1) minste skjermdimensjon < 600px  — stabilt på tvers av rotasjon
//      (en telefon er en telefon enten den holdes stående eller
//      liggende). 600 skiller rent: største telefoner har minste
//      side ~450px, minste nettbrett (iPad mini) ~744px.
//   2) pointer: coarse — berøringsskjerm. Hindrer at et lite
//      desktop-vindu (med fin-peker/mus) feilaktig regnes som telefon.
//
// Vi bruker IKKE user-agent-sniffing (skjørt og lett å ta feil).
const PHONE_MAX_MIN_DIM = 600;

function read() {
  if (typeof window === 'undefined') return { isPhone: false, isPortrait: true };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const coarse =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
  return {
    isPhone: Math.min(w, h) < PHONE_MAX_MIN_DIM && coarse,
    isPortrait: h >= w,
  };
}

export function usePhoneViewport() {
  const [state, setState] = useState(read);

  useEffect(() => {
    const update = () => setState(read());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return state;
}
