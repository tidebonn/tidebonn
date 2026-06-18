/**
 * Shared utility for computing the current position in a prayer series cycle.
 * A "bønneseriedag" runs from start_time on start_day to the bønn just before
 * start_time on the next occurrence of start_day.
 *
 * TIME_ORDER defines the canonical ordering of prayer times within a day.
 */

export const TIME_ORDER = [
  'matutin', 'laudes', 'prim', 'ters', 'sekst', 'non', 'vesper', 'kompletorium'
];

// Omtrentlig klokketid hvor hver liturgisk time starter. Brukt til
// både å avgjøre hvilken tid vi er i NÅ ut fra klokken, og hvilken
// kalenderdag en gitt time hører til innenfor et bønnedøgn.
export const SLOT_START_HOURS = {
  matutin: 2, laudes: 6, prim: 6.5, ters: 9,
  sekst: 12, non: 15, vesper: 18, kompletorium: 21,
};

export const START_DAY_MAP = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 0
};

export const WEEKDAY_NAMES_NO = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
export const WEEKDAY_NAMES_SHORT_NO = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

// Hvilken liturgisk time vi er i NÅ basert på klokken.
export function getCurrentTimeSlot(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 2 && hour < 6) return 'matutin';
  if (hour >= 6 && hour < 9) return 'laudes';
  if (hour >= 9 && hour < 12) return 'ters';
  if (hour >= 12 && hour < 15) return 'sekst';
  if (hour >= 15 && hour < 17) return 'non';
  if (hour >= 17 && hour < 21) return 'vesper';
  return 'kompletorium';
}

// Får anker-dato for bønnedøgn 1 = første start_day på/etter
// series_start_date, på start_time-klokken. Returnerer null hvis
// series_start_date mangler.
function getSeriesAnchor(series) {
  if (!series?.series_start_date) return null;
  const startTime = series.start_time || 'laudes';
  const startDayJs = START_DAY_MAP[series.start_day || 'saturday'];
  const startTimeHour = SLOT_START_HOURS[startTime] ?? 0;

  const seriesStartDate = new Date(series.series_start_date);
  seriesStartDate.setHours(0, 0, 0, 0);
  const dayOfWeekOfStart = seriesStartDate.getDay();
  const daysToStartDay = (startDayJs - dayOfWeekOfStart + 7) % 7;

  const anchorDate = new Date(seriesStartDate);
  anchorDate.setDate(anchorDate.getDate() + daysToStartDay);

  const anchorDatetime = new Date(anchorDate);
  const startHourInt = Math.floor(startTimeHour);
  const startMinutes = Math.round((startTimeHour - startHourInt) * 60);
  anchorDatetime.setHours(startHourInt, startMinutes, 0, 0);

  return anchorDatetime;
}

function getCycleLength(series) {
  const isWeekMode = series?.sort_by === 'weeks';
  return isWeekMode ? (series.total_weeks || 4) * 7 : (series?.total_days || 30);
}

// For en gitt liturgisk time, hvilken kalenderdag-offset innenfor sitt
// bønnedøgn? 0 = samme kalenderdag som bønnedøgnet starter, 1 = neste
// kalenderdag. F.eks. med start_time=vesper: vesper og kompletorium
// faller på dag 0 (samme kveld), matutin..non faller på dag 1 (morgen).
export function getCalendarOffsetWithinBonnedogn(timeOfDay, startTime) {
  const t = SLOT_START_HOURS[timeOfDay] ?? 0;
  const s = SLOT_START_HOURS[startTime] ?? 0;
  return t >= s ? 0 : 1;
}

// Hvor i syklusen er vi NÅ — basert på kalenderdato og klokke.
// Returnerer bønnedøgn (1..cycleLength), uke (kalenderuke i syklusen
// fra 1), weekdayOffset (0..6 fra start_day) og currentTime.
// Bønnedøgn-grensen ligger ved start_time, ikke ved midnatt.
export function getCurrentBonnedognPosition(series, now = new Date()) {
  const currentTime = getCurrentTimeSlot(now);
  const isWeekMode = series?.sort_by === 'weeks';
  const cycleLength = getCycleLength(series);

  const anchor = getSeriesAnchor(series);
  if (!anchor) {
    return { bonnedognNumber: 1, week: 1, weekdayOffset: 0, currentTime };
  }

  const elapsedMs = now - anchor;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const posInCycle = ((Math.floor(elapsedDays)) % cycleLength + cycleLength) % cycleLength;
  const bonnedognNumber = posInCycle + 1;

  const week = isWeekMode ? Math.ceil(bonnedognNumber / 7) : null;
  const weekdayOffset = isWeekMode ? (bonnedognNumber - 1) % 7 : null;

  return { bonnedognNumber, week, weekdayOffset, currentTime };
}

// For en gitt kalenderdato, hvilke to bønnedøgn bidrar med bønner?
// morningBonnedogn = bønnedøgnet som ENDER ved start_time denne dagen
//                    (gir morgenbønnene matutin..før start_time).
// eveningBonnedogn = bønnedøgnet som STARTER ved start_time denne dagen
//                    (gir kveldsbønnene fra start_time og utover).
// Begge nummer er 1..cycleLength (wrap-around håndtert via modulo).
export function getBonnedognerForCalendarDay(series, calendarDate) {
  const anchor = getSeriesAnchor(series);
  const cycleLength = getCycleLength(series);
  if (!anchor) {
    return { morningBonnedogn: cycleLength, eveningBonnedogn: 1 };
  }

  // eveningBonnedogn starter ved start_time på denne kalenderdagen.
  const eveningStart = new Date(calendarDate);
  eveningStart.setHours(
    anchor.getHours(),
    anchor.getMinutes(),
    anchor.getSeconds(),
    anchor.getMilliseconds(),
  );

  const elapsedMs = eveningStart - anchor;
  const elapsedDays = Math.round(elapsedMs / (1000 * 60 * 60 * 24));
  const eveningPos = ((elapsedDays % cycleLength) + cycleLength) % cycleLength;
  const eveningBonnedogn = eveningPos + 1;

  const morningPos = ((eveningPos - 1) % cycleLength + cycleLength) % cycleLength;
  const morningBonnedogn = morningPos + 1;

  return { morningBonnedogn, eveningBonnedogn };
}

// Henter alle bønner som faktisk bes på en gitt kalenderdato i serien,
// sortert på klokketid (matutin → kompletorium). Kombinerer
// kveldsbønnene fra «dagens» bønnedøgn med morgenbønnene fra «gårdagens»
// bønnedøgn (= forrige rad i syklusen, med wraparound).
export function getPrayersOnCalendarDay(series, calendarDate, allPrayersInSeries) {
  const startTime = series?.start_time || 'laudes';
  const { morningBonnedogn, eveningBonnedogn } = getBonnedognerForCalendarDay(series, calendarDate);

  const morningPrayers = allPrayersInSeries
    .filter(p => p.day === morningBonnedogn)
    .filter(p => getCalendarOffsetWithinBonnedogn(p.time_of_day, startTime) === 1);

  const eveningPrayers = allPrayersInSeries
    .filter(p => p.day === eveningBonnedogn)
    .filter(p => getCalendarOffsetWithinBonnedogn(p.time_of_day, startTime) === 0);

  return [...morningPrayers, ...eveningPrayers].sort((a, b) => {
    const ha = SLOT_START_HOURS[a.time_of_day] ?? 0;
    const hb = SLOT_START_HOURS[b.time_of_day] ?? 0;
    return ha - hb;
  });
}

// Finner neste oppkomne bønn i serien basert på «nå» — kalenderdato
// og klokke. Wraparound mellom slutt og start av syklus skjer
// sømløst via modulo-aritmetikken i getBonnedognerForCalendarDay.
// Søker maks 7 dager fremover for sikkerhets skyld; serie med
// mindre enn én bønn per dag treffer alltid neste.
export function getNextPrayer(series, allPrayersInSeries, now = new Date()) {
  if (!allPrayersInSeries || allPrayersInSeries.length === 0) return null;
  const currentTime = getCurrentTimeSlot(now);
  const currentHour = SLOT_START_HOURS[currentTime] ?? 0;

  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
    checkDate.setDate(checkDate.getDate() + dayOffset);

    const dayPrayers = getPrayersOnCalendarDay(series, checkDate, allPrayersInSeries);

    for (const p of dayPrayers) {
      const pHour = SLOT_START_HOURS[p.time_of_day] ?? 0;
      if (dayOffset > 0 || pHour >= currentHour) return p;
    }
  }
  return null;
}

// Gir kalenderdato for (calendarWeek, calendarWeekday) i serien, hvor
// calendarWeek=1 og calendarWeekday=0 er første start_day på/etter
// series_start_date. Brukt av Prayers.jsx for å oversette tab-valg
// (uke/Lør) til en faktisk kalenderdato vi kan slå opp bønner for.
export function getCalendarDateForWeekAndWeekday(series, week, weekdayOffset) {
  const anchor = getSeriesAnchor(series);
  if (!anchor) return new Date();
  const result = new Date(anchor);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + (week - 1) * 7 + weekdayOffset);
  return result;
}

// Oversetter (bønnedøgn-nr N, time_of_day) → (kalenderUke, kalenderUkedag)
// hvor bønnen faktisk bes. Brukt for deep-links fra Settings («fortsett her»)
// og push-varsler så vi viser brukeren rett kalenderdag når de klikker.
//
// Bønnedøgn N starter på dag (N-1) fra anker (= uke 1, ukedag 0).
// «Head»-tider (klokke >= start_time) er på samme kalenderdag som N starter.
// «Tail»-tider (klokke < start_time) er på dagen etter.
export function getCalendarPositionForPrayer(series, bonnedognNumber, timeOfDay) {
  const isWeekMode = series?.sort_by === 'weeks';
  if (!isWeekMode || !bonnedognNumber) {
    return { calendarWeek: null, calendarWeekday: null };
  }
  const startTime = series?.start_time || 'laudes';
  const calOffsetWithin = getCalendarOffsetWithinBonnedogn(timeOfDay, startTime);
  const totalOffsetDays = (bonnedognNumber - 1) + calOffsetWithin;
  return {
    calendarWeek: Math.floor(totalOffsetDays / 7) + 1,
    calendarWeekday: totalOffsetDays % 7,
  };
}

/**
 * Given a series and a reference Date (or now), compute:
 *   - seriesDayNumber: 1-based day index in the series cycle
 *   - currentTime: which prayer time slot we're currently in
 *
 * Logic:
 *   A series day starts at start_time on start_day.
 *   So when counting elapsed minutes since series start, we need to subtract
 *   the "offset within the first day" caused by start_time.
 */
export function getCurrentSeriesPosition(series, now = new Date()) {
  const startTime = series.start_time || 'laudes';
  const startDayJs = START_DAY_MAP[series.start_day || 'saturday'];
  const startTimeIndex = TIME_ORDER.indexOf(startTime);

  // Approximate minutes-per-prayer-slot offsets for a day
  // We treat each slot as roughly 3 hours, starting from midnight
  const SLOT_START_HOURS = {
    matutin: 2, laudes: 6, prim: 6.5, ters: 9, sekst: 12, non: 15, vesper: 18, kompletorium: 21
  };

  // Determine the current time slot
  const hour = now.getHours();
  let currentTimeSlot = 'kompletorium';
  if (hour >= 2 && hour < 6) currentTimeSlot = 'matutin';
  else if (hour >= 6 && hour < 9) currentTimeSlot = 'laudes';
  else if (hour >= 9 && hour < 12) currentTimeSlot = 'ters';
  else if (hour >= 12 && hour < 15) currentTimeSlot = 'sekst';
  else if (hour >= 15 && hour < 17) currentTimeSlot = 'non';
  else if (hour >= 17 && hour < 21) currentTimeSlot = 'vesper';

  if (!series.series_start_date) {
    // Fallback: no anchor date, just use calendar day
    return {
      seriesDayNumber: 1,
      week: 1,
      weekdayOffset: 0,
      currentTime: currentTimeSlot
    };
  }

  // Find the actual series start datetime:
  // It's the first occurrence of start_day on or after series_start_date,
  // at the time approximated by start_time.
  const seriesStartDate = new Date(series.series_start_date);
  seriesStartDate.setHours(0, 0, 0, 0);

  // Advance to the correct weekday
  const dayOfWeekOfStart = seriesStartDate.getDay();
  let daysToStartDay = (startDayJs - dayOfWeekOfStart + 7) % 7;
  // series_start_date IS the start day
  const anchorDate = new Date(seriesStartDate);
  anchorDate.setDate(anchorDate.getDate() + daysToStartDay);

  // Anchor ved midnatt på første start_day. seriesDayNumber er
  // kalender-dag i syklusen — brukervisningen viser alle 4 bønner
  // for én kalenderdag samlet. start_time brukes IKKE her; den er
  // kun en liturgisk uke-grense som getAdminSeriesWeek bruker for
  // admin-gruppering.
  const anchorDatetime = new Date(anchorDate);
  anchorDatetime.setHours(0, 0, 0, 0);

  // Minutes elapsed since anchor
  const elapsedMs = now - anchorDatetime;
  if (elapsedMs < 0) {
    // We're before the series has even started
    return { seriesDayNumber: 1, week: 1, weekdayOffset: 0, currentTime: currentTimeSlot };
  }

  // A series-day is 24h = 1440 minutes
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

  // Determine total series length in days
  const isWeekMode = series.sort_by === 'weeks';
  const cycleLengthDays = isWeekMode
    ? (series.total_weeks || 4) * 7
    : (series.total_days || 30);

  // Posisjon i syklusen (0-basert)
  const posInCycle = ((Math.floor(elapsedDays)) % cycleLengthDays + cycleLengthDays) % cycleLengthDays;

  // 1-basert kalender-dag i syklusen
  const seriesDayNumber = posInCycle + 1;

  const week = isWeekMode ? Math.ceil(seriesDayNumber / 7) : null;

  // weekdayOffset: posisjon innenfor uka i serien (0–6). Med
  // midnatt-anchored seriesDayNumber er dette ganske enkelt
  // (seriesDayNumber - 1) % 7 — tilsvarer kalender-ukedag fra
  // start_day.
  const weekdayOffset = isWeekMode ? (seriesDayNumber - 1) % 7 : null;

  return {
    seriesDayNumber,
    week,
    weekdayOffset,
    currentTime: currentTimeSlot
  };
}

/**
 * For admin display: compute which series-week a prayer belongs to,
 * based on the series's own start_day and start_time.
 *
 * The series week 1 begins at (day=1, start_time) and lasts until just before
 * the next occurrence of start_time on start_day (= day=8, start_time).
 * Prayers on the start_day but BEFORE start_time belong to the preceding week.
 *
 * Example: start_time=vesper
 *   - day=8, laudes → still week 1 (before the vesper boundary)
 *   - day=8, vesper → week 2 begins here
 *
 * For series with sort_by='days', use Math.ceil(day / 7) instead.
 */
export function getAdminSeriesWeek(prayer, series) {
  const startTimeIdx = TIME_ORDER.indexOf(series.start_time || 'laudes');
  const timeIdx = TIME_ORDER.indexOf(prayer.time_of_day);
  const SLOTS_PER_DAY = TIME_ORDER.length; // 8
  const SLOTS_PER_WEEK = 7 * SLOTS_PER_DAY; // 56

  // Raw slot offset from DB day 1, matutin
  const rawOffset = (prayer.day - 1) * SLOTS_PER_DAY + timeIdx;

  // Shift so that week 1 starts at (day=1, start_time)
  const adjustedOffset = rawOffset - startTimeIdx;

  if (adjustedOffset < 0) {
    // Prayer is on day=1 before start_time — belongs to week 1 (pre-start content)
    return { seriesWeek: 1 };
  }

  const seriesWeek = Math.floor(adjustedOffset / SLOTS_PER_WEEK) + 1;
  return { seriesWeek };
}

/**
 * Given all prayers in a series, find the highest day that actually has prayers.
 * This is the "real" end of the series (ignoring empty days).
 */
export function getLastActiveDayInSeries(prayers) {
  if (!prayers || prayers.length === 0) return 0;
  return Math.max(...prayers.map(p => p.day));
}

/**
 * Given all prayers in a series (week mode), find the highest week that has prayers.
 */
export function getLastActiveWeekInSeries(prayers) {
  if (!prayers || prayers.length === 0) return 0;
  const maxDay = getLastActiveDayInSeries(prayers);
  return Math.ceil(maxDay / 7);
}