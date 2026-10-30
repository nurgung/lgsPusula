import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { StateMessage } from "@/components/ui/state-message";
import { buildCoachingReport } from "@/features/coaching/rules";
import { goalCompletions } from "@/features/coaching/metrics";
import { buildExamAnalysis, type AnalysisExam } from "@/features/exams/analysis";
import { StudentHomeView } from "@/features/home/components/student-home-view";
import { evaluateGrowth, type StudyContribution } from "@/features/mascot/growth";
import type { RewardEvent } from "@/features/mascot/rules";
import {
  addCalendarDays,
  formatTurkishDateRange,
  goalWindow,
  istanbulToday,
} from "@/features/study/calendar";
import {
  sortGoals,
  summarizeLogs,
  type StudyGoalView,
  type StudyLogView,
} from "@/features/study/summary";

export const metadata: Metadata = { title: "Öğrenci ana sayfası (gerçek sıra)" };
// Like `/ogrenci`, today's date is read per request (`connection()` inside Suspense).
export const instant = false;

/**
 * Same composition as `/ogrenci` (`StudentHomeView`) filled with fictional values, so the
 * page can be checked at 320, 390 and 1280 px without a real account. No record is read.
 */
const SUBJECTS = [
  { id: "ornek-turkce", name: "Türkçe" },
  { id: "ornek-matematik", name: "Matematik" },
  { id: "ornek-fen", name: "Fen Bilimleri" },
  { id: "ornek-inkilap", name: "T.C. İnkılap Tarihi ve Atatürkçülük" },
  { id: "ornek-din", name: "Din Kültürü ve Ahlak Bilgisi" },
  { id: "ornek-ingilizce", name: "İngilizce" },
] as const;

function sampleLog(
  id: string,
  studiedOn: string,
  subject: (typeof SUBJECTS)[number],
  questionCount: number,
  correctCount: number,
): StudyLogView {
  const wrongCount = Math.floor((questionCount - correctCount) / 2);
  return {
    id,
    studiedOn,
    subjectId: subject.id,
    subjectName: subject.name,
    topicId: null,
    topicName: null,
    outcomeId: null,
    outcomeCode: null,
    questionCount,
    correctCount,
    wrongCount,
    blankCount: questionCount - correctCount - wrongCount,
    durationMinutes: 35,
  };
}

function sampleExams(today: string): AnalysisExam[] {
  const base = { examType: "lgs_full" } as const;
  return [
    {
      ...base,
      id: "ornek-5",
      title: "Örnek deneme 5",
      takenOn: addCalendarDays(today, -2),
      totalNet: 61.67,
      score: 438.2,
    },
    {
      ...base,
      id: "ornek-4",
      title: "Örnek deneme 4",
      takenOn: addCalendarDays(today, -9),
      totalNet: 55.33,
      score: 421.75,
    },
    {
      ...base,
      id: "ornek-3",
      title: "Örnek deneme 3",
      takenOn: addCalendarDays(today, -16),
      totalNet: 57,
      score: 426,
    },
    {
      ...base,
      id: "ornek-2",
      title: "Örnek deneme 2",
      takenOn: addCalendarDays(today, -23),
      totalNet: 48.5,
      score: 401.5,
    },
    {
      ...base,
      id: "ornek-1",
      title: "Örnek deneme 1",
      takenOn: addCalendarDays(today, -30),
      totalNet: 44.25,
      score: 389,
    },
  ];
}

const SAMPLE_REWARDS: RewardEvent[] = [
  {
    eventType: "study_log",
    points: 5,
    sourceDate: "2026-10-20",
    ruleVersion: "mascot-v1",
  },
  {
    eventType: "exam_saved",
    points: 5,
    sourceDate: "2026-10-21",
    ruleVersion: "mascot-v1",
  },
];

export default function StudentHomePreviewPage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <StudentHomePreview />
    </Suspense>
  );
}

async function StudentHomePreview() {
  await connection();
  const today = istanbulToday();
  const week = goalWindow("week", today);
  const logs: StudyLogView[] = [
    sampleLog("ornek-log-1", today, SUBJECTS[1], 40, 31),
    sampleLog("ornek-log-2", today, SUBJECTS[0], 20, 16),
    sampleLog("ornek-log-3", week.from, SUBJECTS[2], 25, 18),
    sampleLog("ornek-log-4", week.from, SUBJECTS[3], 12, 9),
  ];
  const goals: StudyGoalView[] = [
    {
      id: "ornek-hedef-gun",
      period: "day",
      subjectId: null,
      subjectName: null,
      targetQuestions: 80,
    },
    {
      id: "ornek-hedef-mat",
      period: "day",
      subjectId: SUBJECTS[1].id,
      subjectName: SUBJECTS[1].name,
      targetQuestions: 30,
    },
    {
      id: "ornek-hedef-hafta",
      period: "week",
      subjectId: null,
      subjectName: null,
      targetQuestions: 400,
    },
  ];
  const weekSummary = summarizeLogs(logs, { from: week.from, to: today });
  const contributions: StudyContribution[] = Array.from({ length: 9 }, (_, index) => ({
    studiedOn: addCalendarDays(today, -index),
    questionCount: 20,
  }));
  const growth = evaluateGrowth({
    today,
    logs: contributions,
    rewards: contributions.map((log) => ({ points: 5, sourceDate: log.studiedOn })),
  });
  const completions = goalCompletions(sortGoals(goals), logs, today);
  const weekQuestions = new Map(
    weekSummary.bySubject.map((row) => [row.subjectId, row.questionCount]),
  );
  const subjectTiles = SUBJECTS.map((subject) => ({
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
  const mistake = {
    outcomeId: "11111111-1111-4111-8111-111111111111",
    outcomeCode: "M.8.1.1",
    outcomeDescription: "Tam sayılarla işlemler yapar.",
    subjectId: "ornek-matematik",
    subjectName: "Matematik",
  } as const;
  const report = buildCoachingReport({
    today,
    logs: [],
    goals: [],
    exams: [],
    mistakes: [
      { ...mistake, kind: "wrong", takenOn: addCalendarDays(today, -5) },
      { ...mistake, kind: "wrong", takenOn: addCalendarDays(today, -5) },
      { ...mistake, kind: "blank", takenOn: addCalendarDays(today, -12) },
    ],
  });
  const todayCount = logs
    .filter((log) => log.studiedOn === today)
    .reduce((sum, log) => sum + log.questionCount, 0);

  return (
    <StudentHomeView
      displayName="Zeynep Defne"
      today={today}
      species="cat"
      growth={growth}
      notices={[
        {
          id: "ornek-seri",
          title: "Seri durdu",
          body: "Son günlerde seri yapamadın. Devam etmek için bugün bir kayıt ekle.",
        },
      ]}
      reminderId="ornek-hatirlatma"
      report={{
        ...report,
        recommendation: { ...report.recommendation, href: "/onizleme/ogrenci" },
      }}
      explanation={null}
      taskFacts={{
        todayLogCount: 2,
        todayQuestionCount: todayCount,
        dailyGoalTarget: 80,
        reviewExamId: null,
      }}
      goals={goals}
      logs={logs}
      subjectTiles={subjectTiles}
      weekLabel={formatTurkishDateRange(weekSummary)}
      week={weekSummary}
      analysis={buildExamAnalysis(sampleExams(today))}
      rewards={SAMPLE_REWARDS}
      activeLink={null}
      pendingLink={null}
    />
  );
}
