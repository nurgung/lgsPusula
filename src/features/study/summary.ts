import {
  defaultComparisonWindows,
  inclusiveDayCount,
  isRealIsoDate,
  MAX_COMPARISON_DAYS,
  STUDY_DATE_MIN,
  type DateWindow,
} from "./calendar";

export type StudyLogView = {
  id: string;
  studiedOn: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  outcomeId: string | null;
  outcomeCode: string | null;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  durationMinutes: number;
};

export type StudyGoalView = {
  id: string;
  period: "day" | "week";
  subjectId: string | null;
  subjectName: string | null;
  targetQuestions: number;
};

export type PeriodSummary = {
  from: string;
  to: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  durationMinutes: number;
  bySubject: {
    subjectId: string;
    subjectName: string;
    questionCount: number;
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    durationMinutes: number;
  }[];
};

export type SubjectComparison = {
  subjectId: string;
  subjectName: string;
  firstQuestions: number;
  secondQuestions: number;
  firstMinutes: number;
  secondMinutes: number;
};

const inWindow = (date: string, window: DateWindow) =>
  date >= window.from && date <= window.to;

/** Totals for an inclusive civil-date window. The result is the sum of the matching logs. */
export function summarizeLogs(
  logs: readonly StudyLogView[],
  window: DateWindow,
): PeriodSummary {
  const matched = logs.filter((log) => inWindow(log.studiedOn, window));
  const bySubject = new Map<string, PeriodSummary["bySubject"][number]>();

  let questionCount = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  let durationMinutes = 0;

  for (const log of matched) {
    questionCount += log.questionCount;
    correctCount += log.correctCount;
    wrongCount += log.wrongCount;
    blankCount += log.blankCount;
    durationMinutes += log.durationMinutes;
    const current = bySubject.get(log.subjectId) ?? {
      subjectId: log.subjectId,
      subjectName: log.subjectName,
      questionCount: 0,
      correctCount: 0,
      wrongCount: 0,
      blankCount: 0,
      durationMinutes: 0,
    };
    current.questionCount += log.questionCount;
    current.correctCount += log.correctCount;
    current.wrongCount += log.wrongCount;
    current.blankCount += log.blankCount;
    current.durationMinutes += log.durationMinutes;
    bySubject.set(log.subjectId, current);
  }

  return {
    from: window.from,
    to: window.to,
    questionCount,
    correctCount,
    wrongCount,
    blankCount,
    durationMinutes,
    bySubject: [...bySubject.values()].sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName, "tr"),
    ),
  };
}

export function questionsInWindow(
  logs: readonly StudyLogView[],
  window: DateWindow,
  subjectId: string | null,
): number {
  return logs.reduce((sum, log) => {
    if (!inWindow(log.studiedOn, window)) return sum;
    if (subjectId !== null && log.subjectId !== subjectId) return sum;
    return sum + log.questionCount;
  }, 0);
}

export function sortGoals(goals: readonly StudyGoalView[]): StudyGoalView[] {
  return [...goals].sort((a, b) => {
    if (a.period !== b.period) return a.period === "day" ? -1 : 1;
    if (a.subjectName === null) return -1;
    if (b.subjectName === null) return 1;
    return a.subjectName.localeCompare(b.subjectName, "tr");
  });
}

export function comparePeriods(
  logs: readonly StudyLogView[],
  first: DateWindow,
  second: DateWindow,
): { first: PeriodSummary; second: PeriodSummary; subjects: SubjectComparison[] } {
  const firstSummary = summarizeLogs(logs, first);
  const secondSummary = summarizeLogs(logs, second);
  const ids = new Map<string, string>();
  for (const row of [...firstSummary.bySubject, ...secondSummary.bySubject]) {
    ids.set(row.subjectId, row.subjectName);
  }
  const subjects = [...ids.entries()]
    .map(([subjectId, subjectName]) => ({
      subjectId,
      subjectName,
      firstQuestions:
        firstSummary.bySubject.find((row) => row.subjectId === subjectId)
          ?.questionCount ?? 0,
      secondQuestions:
        secondSummary.bySubject.find((row) => row.subjectId === subjectId)
          ?.questionCount ?? 0,
      firstMinutes:
        firstSummary.bySubject.find((row) => row.subjectId === subjectId)
          ?.durationMinutes ?? 0,
      secondMinutes:
        secondSummary.bySubject.find((row) => row.subjectId === subjectId)
          ?.durationMinutes ?? 0,
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "tr"));
  return { first: firstSummary, second: secondSummary, subjects };
}

export type ComparisonQuery =
  | { ok: true; isDefault: boolean; first: DateWindow; second: DateWindow }
  | { ok: false; message: string };

function windowError(window: DateWindow, today: string): string | null {
  if (!isRealIsoDate(window.from) || !isRealIsoDate(window.to)) {
    return "Tarihleri seç.";
  }
  if (window.from > window.to) return "Başlangıç, bitişten sonra olamaz.";
  if (window.from < STUDY_DATE_MIN) return "Bu tarih çok eski. Daha yeni bir gün seç.";
  if (window.to > today) return "İleri bir tarih seçilemez.";
  if (inclusiveDayCount(window.from, window.to) > MAX_COMPARISON_DAYS) {
    return `Bir aralık en fazla ${MAX_COMPARISON_DAYS} gün olabilir.`;
  }
  return null;
}

/** Empty params use the default windows. A partial custom range is rejected. */
export function parseComparisonQuery(
  params: { from1: string; to1: string; from2: string; to2: string },
  today: string,
): ComparisonQuery {
  const blanks = [params.from1, params.to1, params.from2, params.to2].map((value) =>
    value.trim(),
  );
  if (blanks.every((value) => value === "")) {
    const defaults = defaultComparisonWindows(today);
    return {
      ok: true,
      isDefault: true,
      first: defaults.current,
      second: defaults.previous,
    };
  }
  if (blanks.some((value) => value === "")) {
    return { ok: false, message: "Karşılaştırmak için iki aralığın da tarihlerini seç." };
  }
  const first = { from: blanks[0]!, to: blanks[1]! };
  const second = { from: blanks[2]!, to: blanks[3]! };
  const error = windowError(first, today) ?? windowError(second, today);
  if (error) return { ok: false, message: error };
  return { ok: true, isDefault: false, first, second };
}
