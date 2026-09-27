export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  dayOfWeek: number; // 0..6
  holidayName?: string | null;
}

export const WEEKDAY_NAMES_CS_MON = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
export const WEEKDAY_NAMES_CS_SUN = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
export const WEEKDAY_NAMES_CS = WEEKDAY_NAMES_CS_MON;

/**
 * Format local date as YYYY-MM-DD string without UTC offset skew.
 */
export function formatLocalDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function formatDateObj(date: Date): string {
  return formatLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calculates Easter Sunday (Velikonoční neděle) using the Meeus/Jones/Butcher algorithm.
 * Returns 0-indexed month and 1-indexed day.
 */
export function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Returns Czech national or public holiday name for a given YYYY-MM-DD date, or null.
 * Accurately calculates both fixed holidays and movable Easter holidays (Velký pátek, Velikonoční pondělí).
 */
export function getCzechHoliday(dateStr: string): string | null {
  const [y, m, d] = dateStr.split('-').map(Number);
  const monthDay = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Fixed Czech Holidays
  const fixedHolidays: Record<string, string> = {
    '01-01': 'Den obnovy samostatného českého státu / Nový rok',
    '05-01': 'Svátek práce',
    '05-08': 'Den vítězství',
    '07-05': 'Den slovanských věrozvěstů Cyrila a Metoděje',
    '07-06': 'Den upálení mistra Jana Husa',
    '09-28': 'Den české státnosti',
    '10-28': 'Den vzniku samostatného československého státu',
    '11-17': 'Den boje za svobodu a demokracii',
    '12-24': 'Štědrý den',
    '12-25': '1. svátek vánoční',
    '12-26': '2. svátek vánoční',
  };

  if (fixedHolidays[monthDay]) {
    return fixedHolidays[monthDay];
  }

  // Movable Easter Holidays
  const easter = getEasterSunday(y);
  const easterDate = new Date(y, easter.month, easter.day, 12, 0, 0);

  // Velký pátek: Easter Sunday - 2 days
  const goodFriday = new Date(easterDate);
  goodFriday.setDate(easterDate.getDate() - 2);
  if (formatDateObj(goodFriday) === dateStr) {
    return 'Velký pátek';
  }

  // Velikonoční pondělí: Easter Sunday + 1 day
  const easterMonday = new Date(easterDate);
  easterMonday.setDate(easterDate.getDate() + 1);
  if (formatDateObj(easterMonday) === dateStr) {
    return 'Velikonoční pondělí';
  }

  return null;
}

/**
 * Calculates standard ISO 8601 week number for a given Date.
 */
export function getIsoWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3); // Thursday of this week
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Returns an array of exact YYYY-MM-DD date strings between startDateStr and endDateStr (inclusive).
 * Uses local noon (12:00:00) so it is 100% immune to UTC offset skew and Daylight Saving Time (DST).
 */
export function getDatesBetween(startDateStr: string, endDateStr: string): string[] {
  const min = startDateStr < endDateStr ? startDateStr : endDateStr;
  const max = startDateStr < endDateStr ? endDateStr : startDateStr;

  const [sY, sM, sD] = min.split('-').map(Number);
  const [eY, eM, eD] = max.split('-').map(Number);

  const dates: string[] = [];
  const current = new Date(sY, sM - 1, sD, 12, 0, 0);
  const end = new Date(eY, eM - 1, eD, 12, 0, 0);

  while (current <= end) {
    dates.push(formatDateObj(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Generates all cells for a 7-column calendar matrix.
 * Supports configurable first day of week ('monday' or 'sunday') and holiday detection.
 */
export function generateMonthDays(
  viewDate: Date | string,
  firstDayOfWeek: 'monday' | 'sunday' = 'monday',
  showHolidays: boolean = true
): CalendarDay[] {
  const safeDate = viewDate instanceof Date && !isNaN(viewDate.getTime()) ? viewDate : new Date(viewDate || Date.now());
  const validDate = isNaN(safeDate.getTime()) ? new Date() : safeDate;
  const year = validDate.getFullYear();
  const month = validDate.getMonth(); // 0-indexed

  const today = new Date();
  const todayStr = formatLocalDate(today.getFullYear(), today.getMonth(), today.getDate());

  // First day of current month
  const firstDay = new Date(year, month, 1);
  // Calculate start day of week index (0..6)
  const startDayOfWeek =
    firstDayOfWeek === 'sunday'
      ? firstDay.getDay()
      : (firstDay.getDay() + 6) % 7;

  // Number of days in current and previous month
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  const isWeekendCol = (colIdx: number) => {
    if (firstDayOfWeek === 'sunday') {
      return colIdx === 0 || colIdx === 6; // Sunday or Saturday
    }
    return colIdx === 5 || colIdx === 6; // Saturday or Sunday
  };

  // 1. Days from previous month to fill first row
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const dateStr = formatLocalDate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), dayNum);
    const colIdx = (startDayOfWeek - 1 - i);

    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: isWeekendCol(colIdx),
      dayOfWeek: colIdx,
      holidayName: showHolidays ? getCzechHoliday(dateStr) : null,
    });
  }

  // 2. Days of current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = formatLocalDate(year, month, d);
    const colIdx = days.length % 7;

    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: isWeekendCol(colIdx),
      dayOfWeek: colIdx,
      holidayName: showHolidays ? getCzechHoliday(dateStr) : null,
    });
  }

  // 3. Days from next month to complete the last row
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const nextMonthDate = new Date(year, month + 1, n);
    const dateStr = formatLocalDate(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), n);
    const colIdx = days.length % 7;

    days.push({
      dateStr,
      dayNumber: n,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: isWeekendCol(colIdx),
      dayOfWeek: colIdx,
      holidayName: showHolidays ? getCzechHoliday(dateStr) : null,
    });
  }

  return days;
}

/**
 * Returns weeks array where each entry is an array of exactly 7 CalendarDay objects.
 * Guarantees zero column-wrapping bugs on mobile screens.
 */
export function generateWeeks(
  viewDate: Date | string,
  firstDayOfWeek: 'monday' | 'sunday' = 'monday',
  showHolidays: boolean = true
): CalendarDay[][] {
  const safeDate = viewDate instanceof Date && !isNaN(viewDate.getTime()) ? viewDate : new Date(viewDate || Date.now());
  const validDate = isNaN(safeDate.getTime()) ? new Date() : safeDate;
  const allDays = generateMonthDays(validDate, firstDayOfWeek, showHolidays);
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  return weeks;
}
