import db from '@/api/client';

// Bønneteksten (free_text_content, ~20 kB per bønn) er 95 % av tabellen.
// Lister henter bare metadata; teksten hentes først når en bønn åpnes.
export const PRAYER_META_COLUMNS = 'id,series_id,day,time_of_day,title,order_index,is_active,deleted_at';

export function loadActivePrayerMeta() {
  return db.entities.Prayer.filter({ is_active: true }, undefined, undefined, {
    select: PRAYER_META_COLUMNS,
  });
}

export function loadPrayerContent(id) {
  return db.entities.Prayer.get(id, { select: 'id,free_text_content' });
}

// Sist kjente «neste bønn» (metadata + serie), så forsiden kan vise noe
// umiddelbart og fortsatt fungere når henting feiler.
const LAST_NEXT_KEY = 'tidebonn.lastNext';

export function readLastNext() {
  try {
    const raw = window.localStorage.getItem(LAST_NEXT_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value?.next?.id && value?.series ? value : null;
  } catch {
    return null;
  }
}

export function writeLastNext({ next, seriesTitle, series }) {
  try {
    window.localStorage.setItem(
      LAST_NEXT_KEY,
      JSON.stringify({ next, seriesTitle, series, ts: Date.now() }),
    );
  } catch {
    /* localStorage utilgjengelig — cache er valgfri */
  }
}
