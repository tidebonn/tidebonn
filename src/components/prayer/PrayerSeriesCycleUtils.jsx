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

export const START_DAY_MAP = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 0
};

export const WEEKDAY_NAMES_NO = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
export const WEEKDAY_NAMES_SHORT_NO = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

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

  // The anchor datetime is anchorDate at the start_time hour
  const anchorHour = SLOT_START_HOURS[startTime] || 0;
  const anchorDatetime = new Date(anchorDate);
  anchorDatetime.setHours(Math.floor(anchorHour), 0, 0, 0);

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

  // Position within cycle (0-based)
  const posInCycle = ((Math.floor(elapsedDays)) % cycleLengthDays + cycleLengthDays) % cycleLengthDays;

  // But also check within the current day: has start_time passed yet today?
  // The current fractional day position
  const currentTimeIndex = TIME_ORDER.indexOf(currentTimeSlot);

  // Day boundary: a new series-day begins when clock passes start_time
  // elapsedDays fractional part tells us where we are within current series-day
  const fracDay = elapsedDays - Math.floor(elapsedDays);
  const startTimeFrac = anchorHour / 24;

  // Compute series day number (1-based)
  let seriesDayNumber = posInCycle + 1;

  const week = isWeekMode ? Math.ceil(seriesDayNumber / 7) : null;

  // weekdayOffset: the index in the orderedWeekdays array (starting from start_day)
  // We need the actual JS day-of-week of 'now', then find its position in orderedWeekdays.
  let weekdayOffset = null;
  if (isWeekMode) {
    const todayJsDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const rawOffset = (todayJsDay - startDayJs + 7) % 7;
    weekdayOffset = rawOffset;
  }

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