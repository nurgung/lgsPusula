import { DEFAULT_MAX_PER_DAY, MAX_REMINDERS_PER_DAY } from "./constants";

/** `HH:MM` or `HH:MM:SS`, compared as text after padding to seconds. */
export function normalizeClock(value: string): string | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${match[1]}:${match[2]}:${String(second).padStart(2, "0")}`;
}

/**
 * Quiet hours use the Europe/Istanbul wall clock. Equal start and end means
 * quiet hours are off. A start after the end wraps past midnight (21:00–08:00).
 */
export function isQuietTime(now: string, start: string, end: string): boolean {
  const clock = normalizeClock(now);
  const quietStart = normalizeClock(start);
  const quietEnd = normalizeClock(end);
  if (!clock || !quietStart || !quietEnd) return false;
  if (quietStart === quietEnd) return false;
  if (quietStart < quietEnd) return clock >= quietStart && clock < quietEnd;
  return clock >= quietStart || clock < quietEnd;
}

export type ReminderDecisionInput = {
  enabled: boolean;
  now: string;
  quietStart: string;
  quietEnd: string;
  hasStudyLogToday: boolean;
  shownToday: number;
  undismissed: boolean;
  maxPerDay: number;
};

/**
 * Mirrors `open_study_reminder`. An existing undismissed reminder still counts
 * as the same notice; quiet hours and the off switch hide it without a new row.
 */
export function canShowReminder(input: ReminderDecisionInput): boolean {
  if (!input.enabled) return false;
  if (isQuietTime(input.now, input.quietStart, input.quietEnd)) return false;
  if (input.hasStudyLogToday) return false;
  if (input.undismissed) return true;
  const cap = Math.min(Math.max(input.maxPerDay, 1), MAX_REMINDERS_PER_DAY);
  return input.shownToday < cap;
}

export function defaultReminderCap(): number {
  return DEFAULT_MAX_PER_DAY;
}
