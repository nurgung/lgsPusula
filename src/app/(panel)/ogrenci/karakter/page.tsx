import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { MascotSummaryCard, TaskList } from "@/features/mascot/components/mascot-panels";
import { SpeciesForm } from "@/features/mascot/components/species-form";
import { evaluateGrowth } from "@/features/mascot/growth";
import { loadOwnMascot } from "@/features/mascot/load-mascot";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { istanbulToday } from "@/features/study/calendar";
import { loadStudyContributions, loadStudyRecords } from "@/features/study/load-study";

export const metadata: Metadata = { title: "Karakter" };
export const instant = false;

export default function CharacterPage({ searchParams }: PageProps<"/ogrenci/karakter">) {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <Character searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function Character({
  searchParams,
}: Pick<PageProps<"/ogrenci/karakter">, "searchParams">) {
  const user = await requireStudent();
  const today = istanbulToday();
  const [mascot, study, contributions] = await Promise.all([
    loadOwnMascot(user.id, { openReminder: false }),
    loadStudyRecords(user.id, { from: today, to: today }),
    loadStudyContributions(user.id, today),
  ]);
  const todayLogs = study.logs.filter((log) => log.studiedOn === today);
  const saved = one((await searchParams).durum) === "kaydedildi";
  const growth = evaluateGrowth({
    today,
    logs: contributions,
    rewards: mascot.rewards,
  });

  return (
    <>
      <PageHeader
        title="Karakterin"
        description="Bir hayvan ya da bitki seç. Puan kayıt, hedef ve kazanımla artar. Görünür aşama seri, gün, soru ve puan birlikte tamamlanınca ilerler."
      />
      <div className="grid gap-6">
        {saved ? (
          <StateMessage variant="success" title={MASCOT_MESSAGES.savedSpecies} />
        ) : null}
        <MascotSummaryCard
          species={mascot.species}
          rewards={mascot.rewards}
          growth={growth}
          detailed
        />
        <SpeciesForm current={mascot.species} />
        <TaskList
          facts={{
            todayLogCount: todayLogs.length,
            todayQuestionCount: todayLogs.reduce(
              (sum, log) => sum + log.questionCount,
              0,
            ),
            dailyGoalTarget:
              study.goals.find((goal) => goal.period === "day" && goal.subjectId == null)
                ?.targetQuestions ?? null,
            reviewExamId: mascot.reviewExamId,
          }}
        />
      </div>
    </>
  );
}
