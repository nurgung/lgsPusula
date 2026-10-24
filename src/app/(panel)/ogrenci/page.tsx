import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { loadCoachingExplanation } from "@/features/ai/load-explanation";
import { RecommendationCard } from "@/features/coaching/components/recommendation-card";
import { loadCoachingReport } from "@/features/coaching/load-coaching";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { loadExamList } from "@/features/exams/load-exams";
import { CreateInviteForm } from "@/features/family/components/create-invite-form";
import { RespondLinkForms } from "@/features/family/components/respond-link-forms";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { DailyGoals } from "@/features/home/components/daily-goals";
import { EarnedBadges } from "@/features/home/components/earned-badges";
import { GoalBoard } from "@/features/home/components/goal-board";
import { StagePath } from "@/features/home/components/stage-path";
import { SubjectTiles } from "@/features/home/components/subject-tiles";
import { WeekAndExamSummary } from "@/features/home/components/week-and-exam";
import { ReminderCard } from "@/features/mascot/components/mascot-panels";
import { loadOwnMascot } from "@/features/mascot/load-mascot";
import { stageForPoints, totalPoints } from "@/features/mascot/rules";
import { examChartWindow } from "@/features/outcomes/window";
import { STUDENT_DATA_NOTICE } from "@/features/privacy/notice";
import { formatTurkishDate, goalWindow, istanbulToday } from "@/features/study/calendar";
import { loadStudyRecords } from "@/features/study/load-study";
import { summarizeLogs } from "@/features/study/summary";

export const metadata: Metadata = { title: "Ana sayfa" };
export const instant = false;

export default function StudentHomePage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <StudentHome />
    </Suspense>
  );
}

async function StudentHome() {
  const user = await requireStudent();
  const today = istanbulToday();
  const week = goalWindow("week", today);
  const [links, catalog, study, coaching, mascot, exams] = await Promise.all([
    loadOwnFamilyLinks(),
    loadCatalog({ includeArchived: false }),
    loadStudyRecords(user.id, { from: week.from, to: today }),
    loadCoachingReport(user.id, today),
    loadOwnMascot(user.id, { openReminder: true }),
    loadExamList(user.id, examChartWindow(today)),
  ]);
  const explained = await loadCoachingExplanation(user, user.id, coaching, [], today);
  const subjects = catalog.map((subject) => ({ id: subject.id, name: subject.name }));
  const todayLogs = study.logs.filter((log) => log.studiedOn === today);
  const weekSummary = summarizeLogs(study.logs, { from: week.from, to: today });
  const latest = exams[0];
  const active = links.find((link) => link.status === "active");
  const pending = links.find((link) => link.status === "pending");
  const points = totalPoints(mascot.rewards);
  const stage = stageForPoints(points);
  const taskFacts = {
    todayLogCount: todayLogs.length,
    todayQuestionCount: todayLogs.reduce((sum, log) => sum + log.questionCount, 0),
    dailyGoalTarget:
      study.goals.find((goal) => goal.period === "day" && goal.subjectId == null)
        ?.targetQuestions ?? null,
    reviewExamId: mascot.reviewExamId,
  };

  return (
    <>
      <PageHeader
        title={`Merhaba, ${user.displayName}`}
        description={`Bugün ${formatTurkishDate(today)}. Küçük bir adım da ilerleme sayılır.`}
      />
      {mascot.reminderId ? (
        <div className="mb-6">
          <ReminderCard noticeId={mascot.reminderId} />
        </div>
      ) : null}
      {/*
        Four bands. Source order is the phone: path, today's goals, lesson tiles,
        then the summary. From lg, goals and tiles sit side by side.
      */}
      <div className="grid min-w-0 gap-6 rounded-card bg-canvas-soft p-3 sm:p-5">
        <StagePath
          stageId={stage.id}
          species={mascot.species}
          points={points}
          detailed
        />
        <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="grid min-w-0 gap-6">
            <DailyGoals facts={taskFacts} />
            <GoalBoard goals={study.goals} logs={study.logs} today={today} />
          </div>
          <SubjectTiles subjects={subjects} />
        </div>
        <div className="grid min-w-0 gap-6" role="region" aria-labelledby="alt-ozet">
          <h2 id="alt-ozet" className="text-lg font-bold text-ink-900">
            Özet
          </h2>
          <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
            <WeekAndExamSummary
              summary={weekSummary}
              exam={
                latest
                  ? {
                      id: latest.id,
                      title: latest.title,
                      takenOn: latest.takenOn,
                      examType: latest.examType,
                      totalNet: latest.totalNet,
                    }
                  : null
              }
            />
            <RecommendationCard
              report={explained.report}
              explanation={explained.explanation}
            />
          </div>
          <EarnedBadges rewards={mascot.rewards} />
          <Card variant="quiet" title={STUDENT_DATA_NOTICE.title}>
            <ul className="grid list-disc gap-1 pl-5 text-ink-900">
              {STUDENT_DATA_NOTICE.kept.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-ink-900">{STUDENT_DATA_NOTICE.notKept}</p>
            <p className="mt-3 text-ink-900">{STUDENT_DATA_NOTICE.parent}</p>
            <p className="mt-3 text-ink-900">{STUDENT_DATA_NOTICE.device}</p>
            <p className="mt-3 text-ink-900">{STUDENT_DATA_NOTICE.ai}</p>
          </Card>

          {active ? (
            <Card
              title="Bağlı velin"
              description="Çalışmalarını görebilir, değiştiremez."
            >
              <div className="grid gap-4">
                <p className="font-semibold text-ink-900">{active.parent_display_name}</p>
                <RevokeLinkButton
                  linkId={active.id}
                  description="Kaldırınca velin çalışmalarını göremez. İstersen sonra yeni bir kodla yine bağlanabilirsiniz."
                />
              </div>
            </Card>
          ) : null}

          {pending ? (
            <Card
              title="Bağlantı isteği"
              description={`${pending.parent_display_name} velin olarak bağlanmak istiyor.`}
            >
              <RespondLinkForms linkId={pending.id} />
            </Card>
          ) : null}

          {!active && !pending ? (
            <Card title="Veli bağlantısı">
              <div className="grid gap-4">
                <StateMessage
                  variant="empty"
                  title="Henüz bir velin bağlı değil."
                  description="Kod üret, veline söyle. Veli kodu girince isteği burada görürsün. Onaylamadan bağlantı kurulmaz."
                />
                <CreateInviteForm />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
