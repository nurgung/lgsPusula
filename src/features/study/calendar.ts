/**
 * Calendar dates for study logs and goals. Instants are stored in UTC; a "day" is the
 * Europe/Istanbul civil date. Turkey has used UTC+3 all year since 2016; the IANA zone
 * is still the source of truth so a future offset change does not require a code guess.
 * Weeks start on Monday and end on Sunday.
 */

export const APP_TIME_ZONE = "Europe/Istanbul";

/** Earliest day a student may log. Two school years of backfill, not an open-ended past. */
export const STUDY_DATE_MIN = "2024-09-01";

/** A comparison may cover at most this many days so a request stays bounded. */
export const MAX_COMPARISON_DAYS = 370;

/** The study list shows this many days ending today, including today. */
export const STUDY_LIST_DAYS = 14;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DateWindow = { from: string; to: string };

export function isRealIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

/** Civil date (`YYYY-MM-DD`) of an instant in the given IANA time zone. */
export function calendarDateInTimeZone(instant: Date, timeZone = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not format a calendar date.");
  }
  return `${year}-${month}-${day}`;
}

export function istanbulToday(now: Date = new Date()): string {
  return calendarDateInTimeZone(now, APP_TIME_ZONE);
}

/** Adds days to a civil date. Does not interpret the date as a time zone instant. */
export function addCalendarDays(isoDate: string, days: number): string {
  if (!isRealIsoDate(isoDate) || !Number.isInteger(days)) {
    throw new Error("Invalid calendar date.");
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year!, month! - 1, day! + days));
  return utc.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndexMonday(isoDate: string): number {
  if (!isRealIsoDate(isoDate)) throw new Error("Invalid calendar date.");
  const [year, month, day] = isoDate.split("-").map(Number);
  const sundayBased = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return sundayBased === 0 ? 6 : sundayBased - 1;
}

export function startOfWeek(isoDate: string): string {
  return addCalendarDays(isoDate, -weekdayIndexMonday(isoDate));
}

export function endOfWeek(isoDate: string): string {
  return addCalendarDays(startOfWeek(isoDate), 6);
}

export function inclusiveDayCount(from: string, to: string): number {
  if (!isRealIsoDate(from) || !isRealIsoDate(to) || from > to) {
    throw new Error("Invalid date window.");
  }
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const ms = Date.UTC(y2!, m2! - 1, d2!) - Date.UTC(y1!, m1! - 1, d1!);
  return Math.round(ms / 86_400_000) + 1;
}

export function recentListWindow(today: string): DateWindow {
  return { from: addCalendarDays(today, -(STUDY_LIST_DAYS - 1)), to: today };
}

/**
 * Weekly goal period: Monday through Sunday of the week that contains `today`.
 * Daily goal period: that single civil date.
 */
export function goalWindow(period: "day" | "week", today: string): DateWindow {
  if (period === "day") return { from: today, to: today };
  return { from: startOfWeek(today), to: endOfWeek(today) };
}

/**
 * Default comparison: this week from Monday through today, and the previous full
 * Monday–Sunday week. The ranges are unequal when today is not Sunday; the labels
 * must show both ranges so that is not read as a finished week.
 */
export function defaultComparisonWindows(today: string): {
  current: DateWindow;
  previous: DateWindow;
} {
  const currentFrom = startOfWeek(today);
  const previousTo = addCalendarDays(currentFrom, -1);
  return {
    current: { from: currentFrom, to: today },
    previous: { from: startOfWeek(previousTo), to: previousTo },
  };
}

export function formatTurkishDate(isoDate: string): string {
  if (!isRealIsoDate(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!)));
}

export function formatTurkishDateRange(window: DateWindow): string {
  if (window.from === window.to) return formatTurkishDate(window.from);
  return `${formatTurkishDate(window.from)} – ${formatTurkishDate(window.to)}`;
}
