import { addCalendarDays, type DateWindow } from "@/features/study/calendar";

/** Default window for outcome priority and net trend (includes today). */
export const OUTCOME_ANALYSIS_DAYS = 90;

export function outcomeAnalysisWindow(today: string): DateWindow {
  return { from: addCalendarDays(today, -(OUTCOME_ANALYSIS_DAYS - 1)), to: today };
}
