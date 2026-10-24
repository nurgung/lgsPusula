import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { StateMessage } from "@/components/ui/state-message";
import { goalCompletions, type GoalCompletion } from "@/features/coaching/metrics";
import {
  sortGoals,
  type StudyGoalView,
  type StudyLogView,
} from "@/features/study/summary";

export function GoalBoard({
  goals,
  logs,
  today,
}: {
  goals: readonly StudyGoalView[];
  logs: readonly StudyLogView[];
  today: string;
}) {
  const rows = goalCompletions(sortGoals(goals), logs, today);
  const daily = rows.filter((row) => row.period === "day");
  const weekly = rows.filter((row) => row.period === "week");

  return (
    <Card
      title="Hedeflerin"
      description="Gün bugünü sayar. Hafta pazartesiden pazara kadar sayılır. Birim: soru."
    >
      {rows.length === 0 ? (
        <div className="grid gap-4">
          <StateMessage
            variant="empty"
            title="Henüz hedefin yok."
            description="İstersen bir soru sayısı seç. Seçmezsen de kayıt yazabilirsin."
          />
          <div>
            <ButtonLink href="/ogrenci/hedefler">Hedef belirle</ButtonLink>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <GoalGroup
            id="gunluk-hedef"
            title="Günlük hedef"
            rows={daily}
            empty="Bugün için hedefin yok."
          />
          <GoalGroup
            id="haftalik-hedef"
            title="Haftalık hedef"
            rows={weekly}
            empty="Bu hafta için hedefin yok."
          />
          <div>
            <ButtonLink href="/ogrenci/hedefler" variant="secondary">
              Hedefi düzenle
            </ButtonLink>
          </div>
        </div>
      )}
    </Card>
  );
}

function GoalGroup({
  id,
  title,
  rows,
  empty,
}: {
  id: string;
  title: string;
  rows: readonly GoalCompletion[];
  empty: string;
}) {
  return (
    <section className="grid min-w-0 gap-3" aria-labelledby={id}>
      <h3 id={id} className="text-base font-bold text-ink-900">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-ink-700">{empty}</p>
      ) : (
        <ul className="grid min-w-0 gap-4">
          {rows.map((row) => {
            const scope = row.subjectName ?? "Tüm dersler";
            return (
              <li key={row.goalId} className="grid min-w-0 gap-2">
                <ProgressMeter
                  label={scope}
                  value={row.doneQuestions}
                  max={row.targetQuestions}
                  unit="soru"
                />
                <p
                  className={
                    row.met
                      ? "text-sm font-semibold text-success-700"
                      : "text-sm text-ink-700"
                  }
                >
                  {row.met ? "Hedefe ulaştın." : `Kalan ${row.remainingQuestions} soru.`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
