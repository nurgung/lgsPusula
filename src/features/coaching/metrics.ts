import type { ExamType } from "@/features/exams/net-rules";
import {
  prioritiseOutcomes,
  type OutcomePriority,
  type PrioritisableMistake,
} from "@/features/outcomes/prioritize";
import { goalWindow, type DateWindow } from "@/features/study/calendar";
import {
  questionsInWindow,
  type StudyGoalView,
  type StudyLogView,
} from "@/features/study/summary";
import { MIN_ACCURACY_QUESTIONS } from "./constants";

export type CoachingExamPoint = {
  id: string;
  title: string;
  takenOn: string;
  examType: ExamType;
  totalNet: number;
};

export type GoalCompletion = {
  goalId: string;
  period: "day" | "week";
  subjectId: string | null;
  subjectName: string | null;
  targetQuestions: number;
  doneQuestions: number;
  remainingQuestions: number;
  met: boolean;
  window: DateWindow;
};

export type SubjectAccuracy = {
  subjectId: string;
  subjectName: string;
  questionCount: number;
  correctCount: number;
  sufficient: boolean;
  /** Null when the sample is below {@link MIN_ACCURACY_QUESTIONS}. */
  correctShare: number | null;
  window: DateWindow;
};

export type ExamChange =
  | { sufficient: false; fullExamCount: number }
  | {
      sufficient: true;
      earlier: CoachingExamPoint;
      later: CoachingExamPoint;
      /** later total − earlier total. Negative means the later paper is lower. */
      delta: number;
    };

const inWindow = (date: string, window: DateWindow) =>
  date >= window.from && date <= window.to;

export function goalCompletions(
  goals: readonly StudyGoalView[],
  logs: readonly StudyLogView[],
  today: string,
): GoalCompletion[] {
  return goals.map((goal) => {
    const window = goalWindow(goal.period, today);
    const doneQuestions = questionsInWindow(logs, window, goal.subjectId);
    const remainingQuestions = Math.max(0, goal.targetQuestions - doneQuestions);
    return {
      goalId: goal.id,
      period: goal.period,
      subjectId: goal.subjectId,
      subjectName: goal.subjectName,
      targetQuestions: goal.targetQuestions,
      doneQuestions,
      remainingQuestions,
      met: doneQuestions >= goal.targetQuestions,
      window,
    };
  });
}

/** Practice accuracy by subject. A share is stored only when the sample is large enough. */
export function subjectAccuracy(
  logs: readonly StudyLogView[],
  window: DateWindow,
): SubjectAccuracy[] {
  const bySubject = new Map<
    string,
    { subjectName: string; questionCount: number; correctCount: number }
  >();

  for (const log of logs) {
    if (!inWindow(log.studiedOn, window)) continue;
    const current = bySubject.get(log.subjectId) ?? {
      subjectName: log.subjectName,
      questionCount: 0,
      correctCount: 0,
    };
    current.questionCount += log.questionCount;
    current.correctCount += log.correctCount;
    bySubject.set(log.subjectId, current);
  }

  return [...bySubject.entries()]
    .map(([subjectId, row]) => {
      const sufficient = row.questionCount >= MIN_ACCURACY_QUESTIONS;
      return {
        subjectId,
        subjectName: row.subjectName,
        questionCount: row.questionCount,
        correctCount: row.correctCount,
        sufficient,
        correctShare: sufficient ? row.correctCount / row.questionCount : null,
        window,
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "tr"));
}

/**
 * Change between the two most recent full LGS papers in the window.
 * Branch papers are left out: they are not the same test.
 * Same-day papers break ties by title, then id.
 */
export function examChange(exams: readonly CoachingExamPoint[]): ExamChange {
  const full = exams
    .filter((exam) => exam.examType === "lgs_full")
    .sort(
      (a, b) =>
        a.takenOn.localeCompare(b.takenOn) ||
        a.title.localeCompare(b.title, "tr") ||
        a.id.localeCompare(b.id),
    );
  if (full.length < 2) return { sufficient: false, fullExamCount: full.length };
  const earlier = full[full.length - 2]!;
  const later = full[full.length - 1]!;
  return { sufficient: true, earlier, later, delta: later.totalNet - earlier.totalNet };
}

export function reviewOutcomes(
  mistakes: readonly PrioritisableMistake[],
  window: DateWindow,
): OutcomePriority[] {
  return prioritiseOutcomes(
    mistakes.filter((mistake) => inWindow(mistake.takenOn, window)),
  );
}
