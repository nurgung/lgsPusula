import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { loadCoachingExplanation } from "@/features/ai/load-explanation";
import { RecommendationCard } from "@/features/coaching/components/recommendation-card";
import { loadCoachingReport } from "@/features/coaching/load-coaching";
import { goalCompletions } from "@/features/coaching/metrics";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { loadExamList } from "@/features/exams/load-exams";
import { CreateInviteForm } from "@/features/family/components/create-invite-form";
import { RespondLinkForms } from "@/features/family/components/respond-link-forms";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { CharacterHero } from "@/features/home/components/character-hero";
import { EarnedBadges } from "@/features/home/components/earned-badges";
import { HomeGoals } from "@/features/home/components/home-goals";
import { SubjectTiles } from "@/features/home/components/subject-tiles";
import { WeekAndExamSummary } from "@/features/home/components/week-and-exam";
import { GrowthNotices } from "@/features/mascot/components/growth-notices";
import { ReminderCard } from "@/features/mascot/components/mascot-panels";
import { evaluateGrowth } from "@/features/mascot/growth";
import { loadOwnMascot } from "@/features/mascot/load-mascot";
import { openGrowthNotices } from "@/features/mascot/load-growth";
import { examChartWindow } from "@/features/outcomes/window";
import { STUDENT_DATA_NOTICE } from "@/features/privacy/notice";
import {
  formatTurkishDate,
  formatTurkishDateRange,
  goalWindow,
  istanbulToday,
} from "@/features/study/calendar";
import { loadStudyRecords, loadStudyContributions } from "@/features/study/load-study";
import { sortGoals, summarizeLogs } from "@/features/study/summary";

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
  const [links, catalog, study, coaching, mascot, exams, contributions] =
    await Promise.all([
      loadOwnFamilyLinks(),
      loadCatalog({ includeArchived: false }),
      loadStudyRecords(user.id, { from: week.from, to: today }),
      loadCoachingReport(user.id, today),
      loadOwnMascot(user.id, { openReminder: true }),
      loadExamList(user.id, examChartWindow(today)),
      loadStudyContributions(user.id, today),
    ]);
  const explained = await loadCoachingExplanation(user, user.id, coaching, [], today);
  const subjects = catalog.map((subject) => ({ id: subject.id, name: subject.name }));
  const todayLogs = study.logs.filter((log) => log.studiedOn === today);
  const weekSummary = summarizeLogs(study.logs, { from: week.from, to: today });
  const latest = exams[0];
  const active = links.find((link) => link.status === "active");
  const pending = links.find((link) => link.status === "pending");
  const growth = evaluateGrowth({
    today,
    logs: contributions,
    rewards: mascot.rewards,
  });
  const growthNotices = await openGrowthNotices(growth.notices, growth.stageName);
  const completions = goalCompletions(sortGoals(study.goals), study.logs, today);
  const weekQuestions = new Map(
    weekSummary.bySubject.map((row) => [row.subjectId, row.questionCount]),
  );
  const subjectTiles = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    weekQuestions: weekQuestions.get(subject.id) ?? 0,
    goals: completions
      .filter((row) => row.subjectId === subject.id)
      .map((row) => ({
        id: row.goalId,
        periodLabel: row.period === "day" ? "Günlük hedef" : "Haftalık hedef",
        doneQuestions: row.doneQuestions,
        targetQuestions: row.targetQuestions,
        met: row.met,
      })),
  }));
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
        compact
        title={`Merhaba, ${user.displayName}`}
        description={`Bugün ${formatTurkishDate(today)}.`}
      />
      {/*
        Phase 2–3: character band first; compact notices; coach card with clear action hierarchy.
        From lg, goals and tiles sit side by side. The canvas stays neutral.
      */}
      <div className="grid min-w-0 gap-section">
        <CharacterHero species={mascot.species} growth={growth} />
        {growthNotices.length > 0 || mascot.reminderId ? (
          <div className="grid min-w-0 gap-2">
            {growthNotices.length > 0 ? <GrowthNotices notices={growthNotices} /> : null}
            {mascot.reminderId ? <ReminderCard noticeId={mascot.reminderId} /> : null}
          </div>
        ) : null}
        <RecommendationCard
          report={explained.report}
          explanation={explained.explanation}
        />
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
          <HomeGoals
            facts={taskFacts}
            goals={study.goals}
            logs={study.logs}
            today={today}
          />
          <SubjectTiles
            subjects={subjectTiles}
            weekLabel={formatTurkishDateRange(weekSummary)}
          />
        </div>
        <div className="grid min-w-0 gap-4" role="region" aria-labelledby="alt-ozet">
          <h2 id="alt-ozet" className="text-lg font-bold text-ink-900">
            Özet
          </h2>
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
