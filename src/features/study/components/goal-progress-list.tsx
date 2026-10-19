import { ProgressMeter } from "@/components/ui/progress-meter";
import { StateMessage } from "@/components/ui/state-message";
import { formatTurkishDateRange, goalWindow } from "@/features/study/calendar";
import {
  questionsInWindow,
  sortGoals,
  type StudyGoalView,
  type StudyLogView,
} from "@/features/study/summary";

export function GoalProgressList({
  goals,
  logs,
  today,
  period,
  emptyTitle,
  emptyDescription,
}: {
  goals: readonly StudyGoalView[];
  logs: readonly StudyLogView[];
  today: string;
  period?: "day" | "week";
  emptyTitle: string;
  emptyDescription: string;
}) {
  const shown = sortGoals(goals).filter((goal) =>
    period ? goal.period === period : true,
  );
  if (shown.length === 0) {
    return (
      <StateMessage variant="empty" title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      {shown.map((goal) => {
        const window = goalWindow(goal.period, today);
        const value = questionsInWindow(logs, window, goal.subjectId);
        const scope = goal.subjectName ?? "Tüm dersler";
        const periodLabel = goal.period === "day" ? "Günlük hedef" : "Haftalık hedef";
        return (
          <div key={goal.id} className="grid min-w-0 gap-2">
            <p className="text-sm text-ink-700">
              {periodLabel} · {scope} · {formatTurkishDateRange(window)} · birim: soru
            </p>
            <ProgressMeter
              label={`${periodLabel}: ${scope}`}
              value={value}
              max={goal.targetQuestions}
              unit="soru"
            />
          </div>
        );
      })}
    </div>
  );
}
