import {
  addCalendarDays,
  STUDY_DATE_MIN,
  type DateWindow,
} from "@/features/study/calendar";

/** Default window for outcome priority and coaching (includes today). */
export const OUTCOME_ANALYSIS_DAYS = 90;

export function outcomeAnalysisWindow(today: string): DateWindow {
  return { from: addCalendarDays(today, -(OUTCOME_ANALYSIS_DAYS - 1)), to: today };
}

/**
 * Net chart window. Same earliest day a student may enter an exam, through today.
 * A 90-day cut hid a real earlier paper and the chart then said two exams were missing.
 */
export function examChartWindow(today: string): DateWindow {
  return { from: STUDY_DATE_MIN, to: today };
}
