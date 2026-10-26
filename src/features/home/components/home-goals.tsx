import { Card } from "@/components/ui/card";
import type { TaskFacts } from "@/features/mascot/rules";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";
import { DailyGoals } from "./daily-goals";
import { GoalBoard } from "./goal-board";

export function HomeGoals({
  facts,
  goals,
  logs,
  today,
}: {
  facts: TaskFacts;
  goals: readonly StudyGoalView[];
  logs: readonly StudyLogView[];
  today: string;
}) {
  return (
    <Card
      title="Bugünün hedefleri"
      description="Gün bugünü, hafta pazartesiden pazara. Birim soru."
    >
      <section className="grid min-w-0 gap-3" aria-labelledby="bugun-gorev">
        <h3 id="bugun-gorev" className="text-base font-bold text-ink-900">
          Görevler
        </h3>
        <DailyGoals facts={facts} embedded />
      </section>
      <div className="mt-5 border-t border-border pt-4">
        <GoalBoard goals={goals} logs={logs} today={today} embedded />
      </div>
    </Card>
  );
}
