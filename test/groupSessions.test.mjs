// Tester for samlings-deteksjon i src/lib/groupSessions.js.
// Kjør: npm test
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectGroupSessions, GROUP_GAP_MS } from '../src/lib/groupSessions.js';

const T0 = Date.parse('2026-10-08T18:00:00Z');
const min = (n) => n * 60 * 1000;

// En «start»-rad er en logg-rad med completed=false.
function start({ offsetMin = 0, user_id = null, prayer_id = 'p1' } = {}) {
  return {
    prayer_id,
    series_id: 's1',
    day: 13,
    time_of_day: 'vesper',
    user_id,
    completed: false,
    created_at: new Date(T0 + min(offsetMin)).toISOString(),
  };
}

describe('detectGroupSessions', () => {
  test('GROUP_GAP_MS er 5 minutter', () => {
    assert.equal(GROUP_GAP_MS, min(5));
  });

  test('to starter 2 minutter fra hverandre er én samling', () => {
    const sessions = detectGroupSessions([
      start({ offsetMin: 0, user_id: 'a' }),
      start({ offsetMin: 2, user_id: 'b' }),
    ]);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].size, 2);
    assert.equal(sessions[0].readings, 2);
    assert.equal(sessions[0].startedAt.getTime(), T0);
    assert.equal(sessions[0].endedAt.getTime(), T0 + min(2));
  });

  test('to starter 6 minutter fra hverandre er to samlinger', () => {
    const sessions = detectGroupSessions([
      start({ offsetMin: 0, user_id: 'a' }),
      start({ offsetMin: 6, user_id: 'b' }),
    ]);
    assert.equal(sessions.length, 2);
    assert.deepEqual(sessions.map((s) => s.size), [1, 1]);
  });

  test('samme innloggede bruker to ganger = 1 person, 2 lesninger', () => {
    const [s] = detectGroupSessions([
      start({ offsetMin: 0, user_id: 'a' }),
      start({ offsetMin: 1, user_id: 'a' }),
    ]);
    assert.equal(s.loggedIn, 1);
    assert.equal(s.anonymous, 0);
    assert.equal(s.size, 1);
    assert.equal(s.readings, 2);
  });

  test('anonym rad = 1 person', () => {
    const [s] = detectGroupSessions([start({ offsetMin: 0, user_id: null })]);
    assert.equal(s.loggedIn, 0);
    assert.equal(s.anonymous, 1);
    assert.equal(s.size, 1);
    assert.equal(s.readings, 1);
  });

  test('innlogget + anonym innen gapet = 2 personer', () => {
    const [s] = detectGroupSessions([
      start({ offsetMin: 0, user_id: 'a' }),
      start({ offsetMin: 3, user_id: null }),
    ]);
    assert.equal(s.size, 2);
    assert.equal(s.series_id, 's1');
    assert.equal(s.day, 13);
    assert.equal(s.time_of_day, 'vesper');
  });

  test('fullførte rader og ulike bønner grupperes ikke sammen', () => {
    const sessions = detectGroupSessions([
      start({ offsetMin: 0, user_id: 'a' }),
      { ...start({ offsetMin: 1, user_id: 'b' }), completed: true },
      start({ offsetMin: 1, user_id: 'c', prayer_id: 'p2' }),
    ]);
    assert.equal(sessions.length, 2);
    assert.deepEqual(sessions.map((s) => s.readings), [1, 1]);
  });

  test('egendefinert gap og sortering nyest først', () => {
    const sessions = detectGroupSessions(
      [start({ offsetMin: 0, user_id: 'a' }), start({ offsetMin: 2, user_id: 'b' })],
      { gapMs: min(1) },
    );
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].startedAt.getTime(), T0 + min(2));
  });
});
