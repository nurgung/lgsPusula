import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { goalWindow, istanbulToday } from "@/features/study/calendar";
import { DeleteGoalButton } from "@/features/study/components/delete-record-button";
import { GoalForm } from "@/features/study/components/goal-form";
import { GoalProgressList } from "@/features/study/components/goal-progress-list";
import { STUDY_MESSAGES } from "@/features/study/messages";
import { loadStudyRecords } from "@/features/study/load-study";
import { sortGoals } from "@/features/study/summary";

export const metadata: Metadata = { title: "Hedefler" };
export const instant = false;

export default function GoalsPage({ searchParams }: PageProps<"/ogrenci/hedefler">) {
  return (
    <Suspense
      fallback={<StateMessage variant="loading" title="Hedeflerin yükleniyor..." />}
    >
      <GoalsContent searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function GoalsContent({
  searchParams,
}: Pick<PageProps<"/ogrenci/hedefler">, "searchParams">) {
  const user = await requireStudent();
  const today = istanbulToday();
  const week = goalWindow("week", today);
  const [catalog, study] = await Promise.all([
    loadCatalog({ includeArchived: false }),
    loadStudyRecords(user.id, { from: week.from, to: today }),
  ]);
  const subjects = catalog.map((subject) => ({ id: subject.id, name: subject.name }));
  const durum = one((await searchParams).durum);
  const status =
    durum === "kaydedildi"
      ? STUDY_MESSAGES.goalSaved
      : durum === "silindi"
        ? STUDY_MESSAGES.goalDeleted
        : undefined;

  return (
    <>
      <PageHeader
        title="Hedeflerin"
        description="Hedef, çözmek istediğin soru sayısıdır. Günlük hedef bugün, haftalık hedef pazartesiden pazara kadar sayılır. Birim: soru."
      />
      <div className="grid gap-6">
        {status ? <StateMessage variant="success" title={status} /> : null}
        <Card title="İlerlemen">
          <GoalProgressList
            goals={study.goals}
            logs={study.logs}
            today={today}
            emptyTitle="Henüz hedefin yok."
            emptyDescription="Aşağıdan bir soru sayısı seçebilirsin. İstediğin zaman değiştirir veya kaldırırsın."
          />
        </Card>
        {sortGoals(study.goals).length > 0 ? (
          <Card
            title="Hedefi kaldır"
            description="Kaldırmak ilerlemeni silmez. Yalnızca hedefi kaldırır."
          >
            <ul className="grid gap-4">
              {sortGoals(study.goals).map((goal) => (
                <li key={goal.id} className="grid gap-2">
                  <p className="text-ink-900">
                    {goal.period === "day" ? "Günlük" : "Haftalık"} ·{" "}
                    {goal.subjectName ?? "Tüm dersler"} · {goal.targetQuestions} soru
                  </p>
                  <DeleteGoalButton goalId={goal.id} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <Card
          title="Hedef belirle"
          description="Aynı dönem ve ders için yeniden kaydedersen hedef güncellenir. İki kez basmak iki hedef oluşturmaz."
        >
          {subjects.length === 0 ? (
            <StateMessage
              variant="empty"
              title="Ders listesi henüz hazır değil."
              description="Tüm dersler için hedef yazabilirsin. Ders seçmek için listenin hazır olması gerekir."
            />
          ) : null}
          <GoalForm subjects={subjects} />
        </Card>
      </div>
    </>
  );
}
