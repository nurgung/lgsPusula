import {
  defaultComparisonWindows,
  endOfMonth,
  endOfWeek,
  goalWindow,
  monthToDateWindow,
  previousMonthWindow,
  type DateWindow,
} from "@/features/study/calendar";

export type WeeklyReportPeriod = "current" | "previous";
export type ReportScope = "week" | "month";
export type ReportPeriodChoice = WeeklyReportPeriod;

export function weekWindows(today: string): {
  current: DateWindow;
  previous: DateWindow;
  unfinished: boolean;
} {
  const full = goalWindow("week", today);
  return {
    current: { from: full.from, to: today },
    previous: defaultComparisonWindows(today).previous,
    unfinished: today !== endOfWeek(today),
  };
}

export function monthWindows(today: string): {
  current: DateWindow;
  previous: DateWindow;
  unfinished: boolean;
} {
  return {
    current: monthToDateWindow(today),
    previous: previousMonthWindow(today),
    unfinished: today !== endOfMonth(today),
  };
}

/** Logs and exams the parent overview needs: previous month through today, including week edges. */
export function parentOverviewWindow(today: string): DateWindow {
  const month = monthWindows(today);
  const week = weekWindows(today);
  const from = [month.previous.from, week.previous.from, week.current.from].sort()[0]!;
  return { from, to: today };
}

/** The period is chosen on the server from Istanbul today. The form only sends current or previous. */
export function weeklyReportWindow(
  today: string,
  period: WeeklyReportPeriod,
): DateWindow {
  const weeks = weekWindows(today);
  return period === "current" ? weeks.current : weeks.previous;
}

/** Monthly PDF period from Istanbul today. The form only sends current or previous. */
export function monthlyReportWindow(
  today: string,
  period: ReportPeriodChoice,
): DateWindow {
  const months = monthWindows(today);
  return period === "current" ? months.current : months.previous;
}

/** Shared period window for weekly or monthly academic reports. */
export function reportPeriodWindow(
  today: string,
  scope: ReportScope,
  period: ReportPeriodChoice,
): DateWindow {
  return scope === "week"
    ? weeklyReportWindow(today, period)
    : monthlyReportWindow(today, period);
}

export function reportTypeForScope(scope: ReportScope): "weekly_pdf" | "monthly_pdf" {
  return scope === "week" ? "weekly_pdf" : "monthly_pdf";
}
