export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  dayOfWeek: number; // 0 = Mon, 6 = Sun
}

export const WEEKDAY_NAMES_CS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

/**
 * Format local date as YYYY-MM-DD string without UTC offset skew.
 */
export function formatLocalDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Generates all cells for a 7-column calendar matrix (Monday to Sunday).
 */
export function generateMonthDays(viewDate: Date): CalendarDay[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const today = new Date();
  const todayStr = formatLocalDate(today.getFullYear(), today.getMonth(), today.getDate());

  // First day of current month
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Tuesday = 1, ... Sunday = 6
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  // Number of days in current and previous month
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // 1. Days from previous month to fill first row
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const dateStr = formatLocalDate(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), dayNum);
    const dayOfWeek = (prevMonthDate.getDay() + 6) % 7;

    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      dayOfWeek,
    });
  }

  // 2. Days of current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = formatLocalDate(year, month, d);
    const dayOfWeek = (days.length) % 7;

    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      dayOfWeek,
    });
  }

  // 3. Days from next month to complete the last row
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const nextMonthDate = new Date(year, month + 1, n);
    const dateStr = formatLocalDate(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), n);
    const dayOfWeek = (days.length) % 7;

    days.push({
      dateStr,
      dayNumber: n,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      dayOfWeek,
    });
  }

  return days;
}

/**
 * Returns weeks array where each entry is an array of exactly 7 CalendarDay objects.
 * Guarantees zero column-wrapping bugs on mobile screens.
 */
export function generateWeeks(viewDate: Date): CalendarDay[][] {
  const allDays = generateMonthDays(viewDate);
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  return weeks;
}
