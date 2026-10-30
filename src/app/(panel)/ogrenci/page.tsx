import type { Metadata } from "next";
import { Suspense } from "react";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { loadCoachingExplanation } from "@/features/ai/load-explanation";
import { loadCoachingReport } from "@/features/coaching/load-coaching";
import { goalCompletions } from "@/features/coaching/metrics";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { buildExamAnalysis } from "@/features/exams/analysis";
import { loadExamList } from "@/features/exams/load-exams";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { StudentHomeView } from "@/features/home/components/student-home-view";
import { evaluateGrowth } from "@/features/mascot/growth";
import { loadOwnMascot } from "@/features/mascot/load-mascot";
import { openGrowthNotices } from "@/features/mascot/load-growth";
import { examChartWindow } from "@/features/outcomes/window";
import {
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
  const examAnalysis = buildExamAnalysis(exams);
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
    <StudentHomeView
      displayName={user.displayName}
      today={today}
      species={mascot.species}
      growth={growth}
      notices={growthNotices}
      reminderId={mascot.reminderId}
      report={explained.report}
      explanation={explained.explanation}
      taskFacts={taskFacts}
      goals={study.goals}
      logs={study.logs}
      subjectTiles={subjectTiles}
      weekLabel={formatTurkishDateRange(weekSummary)}
      week={weekSummary}
      analysis={examAnalysis}
      rewards={mascot.rewards}
      activeLink={
        active ? { id: active.id, parentName: active.parent_display_name } : null
      }
      pendingLink={
        pending ? { id: pending.id, parentName: pending.parent_display_name } : null
      }
    />
  );
}
