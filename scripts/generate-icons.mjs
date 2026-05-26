// Engangs-skript: genererer PWA-ikoner fra et SVG-master.
// Korset fra Home.jsx skalert opp og sentrert på beige bunn.
// Kjør: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';

const BG = '#F4F0E9'; // Beige (matcher app-bakgrunn)
const FG = '#4A6B65'; // Teal/grønn (matcher Home.jsx-kors)

// Master-SVG: 512x512 med korset sentrert og skalert opp.
// Originalen er 32 bred × 72 høy. Skalert til ~280 × 630 ville
// vært naturalistisk, men da blir det for høyt på et kvadrat-ikon.
// Vi skalerer slik at høyden er 70% av canvas (358px) og bredden følger.
function masterSvg(size) {
  const crossH = size * 0.7;
  const crossW = crossH * (32 / 72);
  const cx = size / 2;
  const cy = size / 2;
  const top = cy - crossH / 2;
  const left = cx - crossW / 2;

  // Skala-faktor fra original 32x72 SVG-koordinater til faktisk pixel-størrelse
  const sx = crossW / 32;
  const sy = crossH / 72;
  // Bruk gjennomsnitt for stroke-skala (så symbolet ikke blir uleselig)
  const ss = (sx + sy) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${left} ${top}) scale(${sx} ${sy})" stroke="${FG}" fill="none" stroke-linecap="round">
    <circle cx="16" cy="6" r="4" stroke-width="${0.7 / ss}"/>
    <circle cx="16" cy="6" r="1.5" stroke-width="${0.5 / ss}"/>
    <line x1="2" y1="22" x2="30" y2="22" stroke-width="${1 / ss}"/>
    <circle cx="2" cy="22" r="2" stroke-width="${0.6 / ss}"/>
    <circle cx="30" cy="22" r="2" stroke-width="${0.6 / ss}"/>
    <line x1="16" y1="1" x2="16" y2="72" stroke-width="${1 / ss}"/>
  </g>
</svg>`;
}

// Maskerbart ikon trenger en "safe zone" på ~80% i midten. Korset er
// allerede sentralt så vi lager det med 60% høyde i stedet for 70%.
function maskableSvg(size) {
  const crossH = size * 0.6;
  const crossW = crossH * (32 / 72);
  const cx = size / 2;
  const cy = size / 2;
  const top = cy - crossH / 2;
  const left = cx - crossW / 2;
  const sx = crossW / 32;
  const sy = crossH / 72;
  const ss = (sx + sy) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${left} ${top}) scale(${sx} ${sy})" stroke="${FG}" fill="none" stroke-linecap="round">
    <circle cx="16" cy="6" r="4" stroke-width="${0.7 / ss}"/>
    <circle cx="16" cy="6" r="1.5" stroke-width="${0.5 / ss}"/>
    <line x1="2" y1="22" x2="30" y2="22" stroke-width="${1 / ss}"/>
    <circle cx="2" cy="22" r="2" stroke-width="${0.6 / ss}"/>
    <circle cx="30" cy="22" r="2" stroke-width="${0.6 / ss}"/>
    <line x1="16" y1="1" x2="16" y2="72" stroke-width="${1 / ss}"/>
  </g>
</svg>`;
}

await mkdir('public/icons', { recursive: true });

const targets = [
  { name: 'icon-192.png', size: 192, svg: masterSvg },
  { name: 'icon-512.png', size: 512, svg: masterSvg },
  { name: 'icon-maskable-512.png', size: 512, svg: maskableSvg },
  { name: 'apple-touch-icon.png', size: 180, svg: masterSvg },
  { name: 'favicon-32.png', size: 32, svg: masterSvg },
];

for (const t of targets) {
  const svg = t.svg(t.size);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(`public/icons/${t.name}`, png);
  console.log(`✓ ${t.name} (${t.size}×${t.size})`);
}

// Også et favicon.ico-vennlig SVG
await writeFile('public/icons/favicon.svg', masterSvg(64));
console.log('✓ favicon.svg');

console.log('\nFerdig. Filer i public/icons/');
