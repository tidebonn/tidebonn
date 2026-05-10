// Seed-skript for Tidebønn.
//
// Leser HTML-filer fra python-ekstraktor/bønner/ og inserter dem som
// rader i Supabase-tabellen "prayers". Oppretter én "Tidebønner gjennom
// året"-serie hvis den ikke finnes. Kjøres lokalt, aldri i produksjon.
//
// Bruk:
//   npm run seed -- --single=uke1_mandag_laudes.html
//   npm run seed -- --single=uke1_mandag_laudes.html --dry-run
//   npm run seed -- --all
//   npm run seed -- --all --dry-run
//
// Krever SUPABASE_URL + SUPABASE_SECRET_KEY i .env.local.

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRAYER_DIR = join(
  __dirname, '..', '..', '..',
  'python-ekstraktor', 'bønner'
);

const TIME_MAP = {
  laudes: 'laudes',
  tidebønn: 'sekst',
  vesper: 'vesper',
  completorium: 'kompletorium',
};

// Kalenderbasert mapping: alle 4 bønner fra én ukedag (laudes, sekst,
// vesper, kompletorium) hører til SAMME `day`-verdi. Brukervisningen
// viser dermed alle Saturdays prayers under "Lørdag", uavhengig av at
// liturgisk uke faktisk skifter ved Sat-vesper.
//
// Med start_day = lørdag: lørdag = day 1, søndag = day 2, ..., fredag
// = day 7. Liturgisk uke-grensen håndteres separat i admin-visningen
// via getAdminSeriesWeek (som bruker time_of_day-skift).
const WEEKDAY_OFFSET_FROM_LORDAG = {
  lørdag: 0, søndag: 1, mandag: 2, tirsdag: 3,
  onsdag: 4, torsdag: 5, fredag: 6,
};

function parseFilename(name) {
  const m = name.match(/^uke(\d+)_([^_]+)_([^.]+)\.html$/);
  if (!m) throw new Error(`Kan ikke parse filnavn: ${name}`);
  const [, weekStr, weekday, timeRaw] = m;
  const week = parseInt(weekStr, 10);
  const offset = WEEKDAY_OFFSET_FROM_LORDAG[weekday];
  const time_of_day = TIME_MAP[timeRaw];
  if (offset === undefined) throw new Error(`Ukjent ukedag: ${weekday}`);
  if (!time_of_day) throw new Error(`Ukjent tid: ${timeRaw}`);

  const day = (week - 1) * 7 + offset + 1;
  return { week, weekday, time_of_day, timeRaw, day };
}

function extractArticle(html) {
  const m = html.match(
    /<article\s+class="bønn"[^>]*>[\s\S]*?<\/article>/
  );
  return m ? m[0] : html;
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!m) return null;
  return m[1]
    .replace(/<br\s*\/?>/gi, ' – ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// --- CLI-argumenter ---
const args = process.argv.slice(2);
const single = args
  .find((a) => a.startsWith('--single='))
  ?.split('=')[1];
const doAll = args.includes('--all');
const DRY = args.includes('--dry-run');

// --- Supabase-klient ---
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error(
    'Mangler SUPABASE_URL eller SUPABASE_SECRET_KEY.\n' +
    'Opprett tidebonn/.env.local med begge verdiene.'
  );
  process.exit(1);
}
const sb = createClient(url, key);

async function ensureSeries() {
  const { data: existing, error: selectErr } = await sb
    .from('prayer_series')
    .select('*')
    .eq('title', 'Tidebønner gjennom året')
    .maybeSingle();
  if (selectErr) throw selectErr;
  if (existing) return existing;

  if (DRY) {
    console.log('[DRY] Ville opprettet serie: "Tidebønner gjennom året"');
    return { id: '00000000-0000-0000-0000-000000000000', title: 'Tidebønner gjennom året' };
  }

  const { data, error } = await sb
    .from('prayer_series')
    .insert({
      title: 'Tidebønner gjennom året',
      description: '4-ukers liturgisk bønnesyklus.',
      sort_by: 'weeks',
      total_weeks: 4,
      total_days: 28,
      available_prayer_times: ['laudes', 'sekst', 'vesper', 'kompletorium'],
      start_day: 'saturday',
      start_time: 'vesper',
      series_start_date: '2026-05-09',
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  console.log(`Opprettet serie: ${data.id}`);
  return data;
}

async function importOne(filename, series) {
  const parsed = parseFilename(filename);
  const html = await readFile(join(PRAYER_DIR, filename), 'utf8');
  const article = extractArticle(html);
  const title = extractTitle(html);

  const row = {
    series_id: series.id,
    day: parsed.day,
    time_of_day: parsed.time_of_day,
    title,
    content_type: 'freetext',
    free_text_content: article,
    order_index: (parsed.day - 1) * 4,
    is_active: true,
  };

  const label =
    `${filename} → day=${parsed.day} (uke ${parsed.week}, ` +
    `${parsed.weekday}), time=${parsed.time_of_day}` +
    ` [${parsed.timeRaw}], title="${title}", html=${article.length}b`;

  if (DRY) {
    console.log(`[DRY] ${label}`);
    return;
  }

  const { data: existing } = await sb
    .from('prayers')
    .select('id')
    .match({
      series_id: series.id,
      day: parsed.day,
      time_of_day: parsed.time_of_day,
    })
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from('prayers')
      .update(row)
      .eq('id', existing.id);
    if (error) throw error;
    console.log(`UPDATED ${label}`);
  } else {
    const { error } = await sb.from('prayers').insert(row);
    if (error) throw error;
    console.log(`INSERTED ${label}`);
  }
}

// --- Kjør ---
if (!single && !doAll) {
  console.error(
    'Bruk: npm run seed -- --single=<fil> | --all  [--dry-run]'
  );
  process.exit(1);
}

const series = await ensureSeries();
console.log(`Serie: ${series.id} "${series.title}"`);

if (single) {
  await importOne(single, series);
} else {
  const files = (await readdir(PRAYER_DIR))
    .filter((f) => f.endsWith('.html'))
    .sort();
  console.log(`Behandler ${files.length} filer...`);
  let ok = 0, fail = 0;
  for (const f of files) {
    try {
      await importOne(f, series);
      ok++;
    } catch (e) {
      console.error(`FEIL ${f}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nFerdig. OK: ${ok}, feil: ${fail}`);
}
