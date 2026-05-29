// Felles håndtering av «Større tekst»-preferansen.
//
// På store skjermer (nettbrett/desktop) skalerer dette HELE appen via
// en root-font-size-bump (klassen .large-text på <html>, se index.css).
// På telefon styres størrelsen i stedet av skjermretningen, så klassen
// har ingen effekt der (CSS-regelen er gated til min 600×600).
//
// Verdien speiles i localStorage (fallback for uinnloggede) og i
// user_progress.large_text (synk på tvers av enheter) — sistnevnte
// håndteres av sidene som leser/skriver progress.

const KEY = 'tidebonn.largeText';

export function applyLargeTextClass(value) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('large-text', !!value);
}

// Sett preferansen lokalt (localStorage + html-klasse). Synk til
// user_progress gjøres separat av kall-stedet.
export function setLargeTextPref(value) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, String(!!value));
  }
  applyLargeTextClass(value);
}

// Kjøres ved oppstart: les localStorage og påfør klassen.
export function initLargeTextClass() {
  if (typeof window === 'undefined') return;
  applyLargeTextClass(window.localStorage.getItem(KEY) === 'true');
}

export function getLargeTextPref() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(KEY) === 'true';
}
