import type { ExamType } from "./net-rules";

/**
 * Read-only analysis of already saved exams for the student home ("Deneme Analizi").
 *
 * Nothing here recomputes a net or invents a score: `totalNet` and `score` are the saved
 * values from the `exams` table. A missing value stays missing (never 0).
 *
 * Input contract: exams in the order `listExams` returns them — newest first, same-day
 * exams newest `created_at` first. That order is the only reliable tie-breaker for exams on
 * the same date, so ties keep it (the sort below is stable and compares dates only).
 */

/** Newest points shown per chart. Keeps labels readable on a 320 px screen. */
export const ANALYSIS_MAX_POINTS = 12;

export type AnalysisExam = {
  id: string;
  title: string;
  takenOn: string;
  examType: ExamType;
  totalNet: number | null;
  score: number | null;
};

export type AnalysisPoint = {
  examId: string;
  title: string;
  takenOn: string;
  value: number;
};

export type AnalysisChange = {
  /** latest − previous, from the two-decimal values the student sees. */
  delta: number;
  direction: "up" | "down" | "same";
};

export type ExamAnalysis = {
  latest: AnalysisExam | null;
  /** The exam right before `latest` among exams of the same type. */
  previous: AnalysisExam | null;
  /** Exams used by the charts, oldest to newest. Same type as `latest`. */
  series: AnalysisExam[];
  /** Exams of the other type left out so one-subject papers never mix with full papers. */
  excludedOtherType: number;
  /** True when older exams exist beyond the newest `ANALYSIS_MAX_POINTS`. */
  truncated: boolean;
  scorePoints: AnalysisPoint[];
  netPoints: AnalysisPoint[];
  latestScore: number | null;
  latestNet: number | null;
  /** Null unless both exams have a saved score. */
  scoreChange: AnalysisChange | null;
  /** Null unless both exams have a valid total net. */
  netChange: AnalysisChange | null;
};

function validNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function changeBetween(
  previous: number | null,
  latest: number | null,
): AnalysisChange | null {
  if (!validNumber(previous) || !validNumber(latest)) return null;
  const delta = roundTwo(roundTwo(latest) - roundTwo(previous));
  return {
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
  };
}

function pointsFor(
  exams: readonly AnalysisExam[],
  pick: (exam: AnalysisExam) => number | null,
): AnalysisPoint[] {
  const points: AnalysisPoint[] = [];
  for (const exam of exams) {
    const value = pick(exam);
    if (!validNumber(value)) continue;
    points.push({
      examId: exam.id,
      title: exam.title,
      takenOn: exam.takenOn,
      value,
    });
  }
  return points;
}

export function buildExamAnalysis(
  examsNewestFirst: readonly AnalysisExam[],
  maxPoints: number = ANALYSIS_MAX_POINTS,
): ExamAnalysis {
  // Oldest to newest. Array.prototype.sort is stable, so same-day exams keep store order.
  const chronological = [...examsNewestFirst]
    .reverse()
    .sort((a, b) => a.takenOn.localeCompare(b.takenOn));
  const latest = chronological.at(-1) ?? null;

  if (!latest) {
    return {
      latest: null,
      previous: null,
      series: [],
      excludedOtherType: 0,
      truncated: false,
      scorePoints: [],
      netPoints: [],
      latestScore: null,
      latestNet: null,
      scoreChange: null,
      netChange: null,
    };
  }

  const sameType = chronological.filter((exam) => exam.examType === latest.examType);
  const series = sameType.slice(-maxPoints);
  const previous = sameType.length >= 2 ? sameType[sameType.length - 2]! : null;
  const latestScore = validNumber(latest.score) ? latest.score : null;
  const latestNet = validNumber(latest.totalNet) ? latest.totalNet : null;

  return {
    latest,
    previous,
    series,
    excludedOtherType: chronological.length - sameType.length,
    truncated: sameType.length > series.length,
    scorePoints: pointsFor(series, (exam) => exam.score),
    netPoints: pointsFor(series, (exam) => exam.totalNet),
    latestScore,
    latestNet,
    scoreChange: previous ? changeBetween(previous.score, latest.score) : null,
    netChange: previous ? changeBetween(previous.totalNet, latest.totalNet) : null,
  };
}

/** "+12,5", "−3" or "0". Uses the real minus sign so the value reads clearly. */
export function formatSignedChange(
  delta: number,
  maxFractionDigits: number,
  minFractionDigits = 0,
): string {
  const digits = delta.toLocaleString("tr-TR", {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  });
  if (delta > 0) return `+${digits}`;
  if (delta < 0) return `−${digits.replace("-", "")}`;
  return digits;
}
