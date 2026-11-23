// Måler tekstkontrast på siden som er åpen, mot WCAG 2.x AA (1.4.3):
// minst 4,5:1 for vanlig tekst og 3:1 for stor tekst (≥ 24 px, eller
// ≥ 18,66 px fet). Lim inn i nettleserkonsollen på hver side og i hver
// åpne dialog, i lyst og mørkt tema. Tom «feil»-liste = bestått.
//
// Skriptet slår av overganger og animasjoner og ser bort fra
// inline-opacity (framer-motion), så målingen ikke treffer midt i en
// animasjon. Deaktiverte kontroller og aria-hidden-innhold hoppes over.
(() => {
  if (!document.getElementById('__kontrast')) {
    const s = document.createElement('style');
    s.id = '__kontrast';
    s.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(s);
  }
  const parse = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const blend = (f, b) => ({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  });
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const background = (el) => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg);
    return bg;
  };
  const opacity = (el) => {
    let o = 1;
    for (let e = el; e; e = e.parentElement) {
      if (e.style && e.style.opacity !== '') continue;
      o *= parseFloat(getComputedStyle(e).opacity);
    }
    return o;
  };
  const feil = new Map();
  let tekstnoder = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const tekst = n.textContent.trim();
    const el = n.parentElement;
    if (!tekst || !el || el.closest('script,style,[disabled],[aria-disabled="true"],[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const bg = background(el);
    const farge = parse(cs.color);
    if (!farge) continue;
    const fg = blend({ ...farge, a: farge.a * opacity(el) }, bg);
    const px = parseFloat(cs.fontSize);
    const vekt = parseInt(cs.fontWeight, 10) || 400;
    const krav = px >= 24 || (px >= 18.66 && vekt >= 700) ? 3 : 4.5;
    const r = ratio(fg, bg);
    tekstnoder++;
    if (r < krav) {
      const key = `${hex(fg)} på ${hex(bg)} · ${px.toFixed(1)}px/${vekt}`;
      const e = feil.get(key) || { kontrast: +r.toFixed(2), krav, antall: 0, eksempel: tekst.slice(0, 40) };
      e.antall++;
      feil.set(key, e);
    }
  }
  return {
    side: location.pathname,
    tema: document.documentElement.classList.contains('dark') ? 'mørkt' : 'lyst',
    tekstnoder,
    feil: [...feil.entries()]
      .sort((a, b) => a[1].kontrast - b[1].kontrast)
      .map(([k, v]) => `${v.kontrast} (krav ${v.krav}) ×${v.antall} · ${k} · «${v.eksempel}»`),
  };
})();
