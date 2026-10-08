// Tester for bønnedøgn-logikken i src/lib/bonnedogn.js.
// Kjør: npm test
//
// All klokke-aritmetikk i modulen er i lokal tid, så vi låser
// tidssonen før Date brukes for å få like svar på alle maskiner.
process.env.TZ = 'Europe/Oslo';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIME_ORDER,
  getPrayersOnCalendarDay,
  getBonnedognerForCalendarDay,
  getNextPrayer,
  getCalendarPositionForPrayer,
} from '../src/lib/bonnedogn.js';

// Fire ukers serie, bønnedøgnet starter ved vesper på lørdag.
// 2026-05-09 er en lørdag, så anker = lør 9. mai 2026 kl. 18:00.
const series = {
  sort_by: 'weeks',
  total_weeks: 4,
  start_day: 'saturday',
  start_time: 'vesper',
  series_start_date: '2026-05-09',
};

// Alle 8 tider for alle 28 bønnedøgn.
const prayers = [];
for (let day = 1; day <= 28; day++) {
  for (const time_of_day of TIME_ORDER) {
    prayers.push({ id: `${day}-${time_of_day}`, day, time_of_day });
  }
}

const key = (p) => (p ? `${p.day}/${p.time_of_day}` : null);

describe('getPrayersOnCalendarDay', () => {
  const morning = (d) => ['matutin', 'laudes', 'prim', 'ters', 'sekst', 'non'].map((t) => `${d}/${t}`);
  const evening = (d) => ['vesper', 'kompletorium'].map((t) => `${d}/${t}`);

  test('ankerlørdagen: morgen fra bønnedøgn 28 (wraparound), kveld fra bønnedøgn 1', () => {
    const result = getPrayersOnCalendarDay(series, new Date(2026, 4, 9), prayers).map(key);
    assert.deepEqual(result, [...morning(28), ...evening(1)]);
  });

  test('lørdag 28 dager senere gir samme svar (syklusen går rundt)', () => {
    const result = getPrayersOnCalendarDay(series, new Date(2026, 5, 6), prayers).map(key);
    assert.deepEqual(result, [...morning(28), ...evening(1)]);
  });

  test('lørdag i uke 2: morgen fra bønnedøgn 7, kveld fra bønnedøgn 8', () => {
    const result = getPrayersOnCalendarDay(series, new Date(2026, 4, 16), prayers).map(key);
    assert.deepEqual(result, [...morning(7), ...evening(8)]);
  });

  test('resultatet er sortert på klokketid, matutin først', () => {
    const times = getPrayersOnCalendarDay(series, new Date(2026, 4, 12), prayers).map((p) => p.time_of_day);
    assert.deepEqual(times, TIME_ORDER);
  });

  test('getBonnedognerForCalendarDay: torsdag 8. okt 2026 er bønnedøgn 12 → 13', () => {
    assert.deepEqual(getBonnedognerForCalendarDay(series, new Date(2026, 9, 8)), {
      morningBonnedogn: 12,
      eveningBonnedogn: 13,
    });
  });
});

describe('getNextPrayer rundt vesper torsdag 8. okt 2026 (bønnedøgn 12 → 13)', () => {
  test('kl. 16:30 (non-vinduet): neste er non fra bønnedøgn 12', () => {
    assert.equal(key(getNextPrayer(series, prayers, new Date(2026, 9, 8, 16, 30))), '12/non');
  });

  test('kl. 17:30, rett før vesper: neste er vesper fra bønnedøgn 13', () => {
    assert.equal(key(getNextPrayer(series, prayers, new Date(2026, 9, 8, 17, 30))), '13/vesper');
  });

  test('kl. 18:30, rett etter vesper: fortsatt vesper fra 13 (vi er inne i vesper-vinduet)', () => {
    assert.equal(key(getNextPrayer(series, prayers, new Date(2026, 9, 8, 18, 30))), '13/vesper');
  });

  test('kl. 21:30: kompletorium fra bønnedøgn 13', () => {
    assert.equal(key(getNextPrayer(series, prayers, new Date(2026, 9, 8, 21, 30))), '13/kompletorium');
  });

  test('kl. 02:30 (matutin-vinduet): matutin fra bønnedøgn 12', () => {
    assert.equal(key(getNextPrayer(series, prayers, new Date(2026, 9, 8, 2, 30))), '12/matutin');
  });

  // Kjent feil: mellom midnatt og 02:00 regner getCurrentTimeSlot oss
  // som i kompletorium (21), så første bønn >= 21 samme kalenderdag
  // blir kveldens kompletorium — hele dagen hoppes over.
  test('kl. 01:30 gir matutin samme morgen (ikke kveldens kompletorium)', () => {
    assert.equal(key(getNextPrayer(series, prayers, new Date(2026, 9, 8, 1, 30))), '12/matutin');
  });

  test('tom bønneliste gir null', () => {
    assert.equal(getNextPrayer(series, [], new Date(2026, 9, 8, 17, 30)), null);
  });
});

describe('getCalendarPositionForPrayer', () => {
  test('siste bønnedøgn (28), laudes: morgenen etter → uke 1, ukedag 0 (wraparound)', () => {
    assert.deepEqual(getCalendarPositionForPrayer(series, 28, 'laudes'), {
      calendarWeek: 1,
      calendarWeekday: 0,
    });
  });

  test('bønnedøgn 8, laudes: morgenen etter → uke 2, ukedag 1', () => {
    assert.deepEqual(getCalendarPositionForPrayer(series, 8, 'laudes'), {
      calendarWeek: 2,
      calendarWeekday: 1,
    });
  });

  test('bønnedøgn 8, vesper: samme kveld → uke 2, ukedag 0', () => {
    assert.deepEqual(getCalendarPositionForPrayer(series, 8, 'vesper'), {
      calendarWeek: 2,
      calendarWeekday: 0,
    });
  });

  test('bønnedøgn 1, laudes → uke 1, ukedag 1', () => {
    assert.deepEqual(getCalendarPositionForPrayer(series, 1, 'laudes'), {
      calendarWeek: 1,
      calendarWeekday: 1,
    });
  });

  test('dag-modus gir null', () => {
    assert.deepEqual(getCalendarPositionForPrayer({ sort_by: 'days', total_days: 30 }, 8, 'laudes'), {
      calendarWeek: null,
      calendarWeekday: null,
    });
  });
});
