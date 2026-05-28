import { useEffect, useState } from 'react';

// Telefon = minste skjermdimensjon < 768px. Dette er STABILT på tvers
// av rotasjon (en telefon er en telefon enten den holdes stående eller
// liggende), i motsetning til en ren max-width-sjekk som flipper når
// brukeren snur enheten.
//
// Returnerer { isPhone, isPortrait } og oppdaterer ved resize og
// orientationchange.
function read() {
  if (typeof window === 'undefined') return { isPhone: false, isPortrait: true };
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    isPhone: Math.min(w, h) < 768,
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
