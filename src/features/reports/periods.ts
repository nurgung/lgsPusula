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
