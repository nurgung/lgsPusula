import { LGS_SUBJECT_LABELS } from "@/features/exams/labels";
import {
  formatNet,
  getNetRule,
  type ExamType,
  type LgsSubjectCode,
  type NetRuleVersion,
} from "@/features/exams/net-rules";
import {
  formatIstanbulDateTime,
  formatTurkishDate,
  formatTurkishDateRange,
  goalWindow,
  type DateWindow,
} from "@/features/study/calendar";
import {
  questionsInWindow,
  summarizeLogs,
  type StudyGoalView,
  type StudyLogView,
} from "@/features/study/summary";
import { REPORT_MESSAGES } from "./messages";
import { weekWindows, weeklyReportWindow, type WeeklyReportPeriod } from "./periods";

export type ReportExamSubject = {
  subjectCode: string;
  subjectName: string;
  net: number;
};

export type ReportExam = {
  title: string;
  takenOn: string;
  examType: ExamType;
  totalNet: number;
  score: number | null;
  ruleVersion: NetRuleVersion;
  subjects: readonly ReportExamSubject[];
};

export type ReportSuggestion = {
  message: string;
  reason: string;
  evidence: readonly string[];
};

export type WeeklyReportInput = {
  studentName: string;
  generatedAt: Date;
  period: WeeklyReportPeriod;
  today: string;
  logs: readonly StudyLogView[];
  goals: readonly StudyGoalView[];
  exams: readonly ReportExam[];
  suggestion: ReportSuggestion;
};

export type StudyDetailRow = {
  studiedOn: string;
  subjectName: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  durationMinutes: number;
};

export type SubjectStudyRow = {
  subjectId: string;
  subjectName: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  durationMinutes: number;
};

export type GoalProgressRow = {
  label: string;
  targetQuestions: number;
  doneQuestions: number;
  ratioLabel: string;
};

export type ExamComparisonRow = {
  subjectName: string;
  latestNet: number | null;
  previousNet: number | null;
  delta: number | null;
  assessment: string;
};

export type WeeklyReportModel = {
  studentName: string;
  periodLabel: string;
  periodNote: string;
  generatedAtLabel: string;
  summary: {
    durationMinutes: number;
    questionCount: number;
    studyDayCount: number;
    examCount: number;
  };
  studyRows: StudyDetailRow[];
  studyTotals: {
    questionCount: number;
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    durationMinutes: number;
  };
  subjectRows: SubjectStudyRow[];
  examsInPeriod: ReportExam[];
  examComparisons: ExamComparisonRow[];
  goalRows: GoalProgressRow[];
  evaluation: readonly string[];
  suggestion: ReportSuggestion;
  lgsSubjectCodes: readonly LgsSubjectCode[];
};

const LGS_CODES = getNetRule("lgs-v1").examTypes.lgs_full.subjects.map(
  (slot) => slot.code,
) as LgsSubjectCode[];

function inReport(date: string, window: DateWindow): boolean {
  return date >= window.from && date <= window.to;
}

function rangeLabel(window: DateWindow): string {
  return formatTurkishDateRange(window).replaceAll("–", "-");
}

/** Minutes stay as a whole number; hours appear only when the value reaches 60. */
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} dakika`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} saat`;
  return `${hours} saat ${rest} dakika`;
}

export function subjectDisplayName(code: string, fallbackName?: string): string {
  return LGS_SUBJECT_LABELS[code] ?? fallbackName ?? code;
}

export function shortSubjectHeader(code: LgsSubjectCode): string {
  switch (code) {
    case "turkce":
      return "Türkçe";
    case "matematik":
      return "Mat.";
    case "fen_bilimleri":
      return "Fen";
    case "inkilap_tarihi":
      return "İnk.";
    case "din_kulturu":
      return "Din";
    case "ingilizce":
      return "İng.";
  }
}

function goalRowsForPeriod(
  goals: readonly StudyGoalView[],
  logs: readonly StudyLogView[],
  today: string,
  report: DateWindow,
  period: WeeklyReportPeriod,
): GoalProgressRow[] {
  const rows: GoalProgressRow[] = [];
  for (const goal of goals) {
    if (goal.period === "day" && period !== "current") continue;
    if (goal.period === "day" && !inReport(today, report)) continue;
    const goalRange = goalWindow(
      goal.period,
      goal.period === "day" ? today : report.from,
    );
    const from = goalRange.from > report.from ? goalRange.from : report.from;
    const to = goalRange.to < report.to ? goalRange.to : report.to;
    if (from > to) continue;
    const done = questionsInWindow(logs, { from, to }, goal.subjectId);
    const scope = goal.subjectName ?? "Tüm dersler";
    const kind = goal.period === "day" ? "Günlük hedef" : "Haftalık hedef";
    let ratioLabel: string;
    if (goal.targetQuestions <= 0) {
      ratioLabel = "Hedef tanımlı değil";
    } else {
      const percent = (done / goal.targetQuestions) * 100;
      ratioLabel = `%${percent.toLocaleString("tr-TR", {
        maximumFractionDigits: 0,
      })}`;
    }
    rows.push({
      label: `${kind}: ${scope}`,
      targetQuestions: goal.targetQuestions,
      doneQuestions: done,
      ratioLabel,
    });
  }
  return rows;
}

function netForCode(exam: ReportExam, code: string): number | null {
  const row = exam.subjects.find((subject) => subject.subjectCode === code);
  return row ? row.net : null;
}

function examComparisons(exams: readonly ReportExam[]): ExamComparisonRow[] {
  if (exams.length === 0) return [];
  const sorted = [...exams].sort(
    (a, b) =>
      a.takenOn.localeCompare(b.takenOn) || a.title.localeCompare(b.title, "tr"),
  );
  const latest = sorted[sorted.length - 1]!;
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2]! : null;
  const codes = new Set<string>();
  for (const exam of [latest, previous].filter(Boolean) as ReportExam[]) {
    for (const subject of exam.subjects) codes.add(subject.subjectCode);
  }
  const orderedCodes = [
    ...LGS_CODES.filter((code) => codes.has(code)),
    ...[...codes].filter((code) => !LGS_CODES.includes(code as LgsSubjectCode)).sort(),
  ];
  return orderedCodes.map((code) => {
    const latestNet = netForCode(latest, code);
    const previousNet = previous ? netForCode(previous, code) : null;
    const name =
      latest.subjects.find((row) => row.subjectCode === code)?.subjectName ??
      previous?.subjects.find((row) => row.subjectCode === code)?.subjectName ??
      subjectDisplayName(code);
    if (latestNet === null) {
      return {
        subjectName: name,
        latestNet: null,
        previousNet,
        delta: null,
        assessment: "Son denemede kayıt yok",
      };
    }
    if (previousNet === null) {
      return {
        subjectName: name,
        latestNet,
        previousNet: null,
        delta: null,
        assessment: "Karşılaştırma yapılamıyor",
      };
    }
    const delta = latestNet - previousNet;
    let assessment = "Değişmedi";
    if (delta > 0) assessment = "Arttı";
    if (delta < 0) assessment = "Azaldı";
    return { subjectName: name, latestNet, previousNet, delta, assessment };
  });
}

function buildEvaluation(input: {
  summary: WeeklyReportModel["summary"];
  studyTotals: WeeklyReportModel["studyTotals"];
  subjectRows: SubjectStudyRow[];
  examComparisons: ExamComparisonRow[];
  examsInPeriod: ReportExam[];
  periodLabel: string;
}): string[] {
  const lines: string[] = [];
  const { summary, studyTotals, subjectRows, examComparisons, examsInPeriod, periodLabel } =
    input;

  if (summary.studyDayCount === 0 && summary.examCount === 0) {
    lines.push(
      `Bu dönemde (${periodLabel}) çalışma kaydı ve deneme yok. Kayıt gelince özet burada görünür.`,
    );
    return lines;
  }

  if (summary.studyDayCount > 0) {
    lines.push(
      `Haftanın çalışma özeti: ${summary.studyDayCount} günde ${studyTotals.questionCount} soru, ${formatDurationMinutes(studyTotals.durationMinutes)}.`,
    );
    const byQuestions = [...subjectRows].sort(
      (a, b) =>
        b.questionCount - a.questionCount ||
        a.subjectName.localeCompare(b.subjectName, "tr"),
    );
    const byMinutes = [...subjectRows].sort(
      (a, b) =>
        b.durationMinutes - a.durationMinutes ||
        a.subjectName.localeCompare(b.subjectName, "tr"),
    );
    const topQuestions = byQuestions[0];
    const topMinutes = byMinutes[0];
    if (topQuestions && topQuestions.questionCount > 0) {
      lines.push(
        `En fazla soru çözülen ders: ${topQuestions.subjectName} (${topQuestions.questionCount} soru).`,
      );
    }
    if (topMinutes && topMinutes.durationMinutes > 0) {
      lines.push(
        `En fazla zaman ayrılan ders: ${topMinutes.subjectName} (${formatDurationMinutes(topMinutes.durationMinutes)}).`,
      );
    }
  } else {
    lines.push("Bu dönemde çalışma kaydı yok. Soru ve süre toplamı denemelere eklenmez.");
  }

  if (examsInPeriod.length === 0) {
    lines.push("Bu dönemde deneme yok. Ders neti karşılaştırması yapılmadı.");
  } else if (examComparisons.length === 0) {
    lines.push("Deneme var ama karşılaştırılacak ders neti yok.");
  } else {
    const risen = examComparisons.filter((row) => row.delta !== null && row.delta > 0);
    const fallen = examComparisons.filter((row) => row.delta !== null && row.delta < 0);
    if (risen.length > 0) {
      lines.push(
        `Neti artan dersler: ${risen.map((row) => row.subjectName).join(", ")}.`,
      );
    }
    if (fallen.length > 0) {
      lines.push(
        `Neti azalan dersler: ${fallen.map((row) => row.subjectName).join(", ")}.`,
      );
    }
    if (risen.length === 0 && fallen.length === 0) {
      const comparable = examComparisons.some((row) => row.delta !== null);
      lines.push(
        comparable
          ? "Karşılaştırılabilen ders netleri aynı kaldı."
          : "Karşılaştırma için en az iki deneme ve ortak ders neti gerekir.",
      );
    }
  }

  const focus: string[] = [];
  for (const row of examComparisons) {
    if (row.delta !== null && row.delta < 0) focus.push(row.subjectName);
  }
  if (focus.length === 0) {
    const withWrong = [...subjectRows]
      .filter((row) => row.wrongCount + row.blankCount > 0)
      .sort(
        (a, b) =>
          b.wrongCount + b.blankCount - (a.wrongCount + a.blankCount) ||
          a.subjectName.localeCompare(b.subjectName, "tr"),
      );
    if (withWrong[0]) focus.push(withWrong[0].subjectName);
  }
  if (focus.length > 0) {
    lines.push(
      `Bir sonraki hafta için öncelik verilebilecek alanlar: ${[...new Set(focus)].join(", ")}. Bu bir zorunluluk değil; kayıtlarına göre seçim yapabilirsin.`,
    );
  } else {
    lines.push(
      "Öncelik önerisi için yeterli karşılaştırma veya çalışma kaydı yok. Yeni kayıt gelince burası dolar.",
    );
  }

  return lines;
}

/**
 * Pure weekly report body. Period comes from Istanbul `today` and `period`.
 * Study and exam totals are never mixed.
 */
export function buildWeeklyReportModel(input: WeeklyReportInput): WeeklyReportModel {
  const report = weeklyReportWindow(input.today, input.period);
  const weeks = weekWindows(input.today);
  const periodSummary = summarizeLogs(input.logs, report);
  const matchedLogs = input.logs
    .filter((log) => inReport(log.studiedOn, report))
    .slice()
    .sort(
      (a, b) =>
        a.studiedOn.localeCompare(b.studiedOn) ||
        a.subjectName.localeCompare(b.subjectName, "tr") ||
        a.id.localeCompare(b.id),
    );
  const studyRows: StudyDetailRow[] = matchedLogs.map((log) => ({
    studiedOn: log.studiedOn,
    subjectName: log.subjectName,
    questionCount: log.questionCount,
    correctCount: log.correctCount,
    wrongCount: log.wrongCount,
    blankCount: log.blankCount,
    durationMinutes: log.durationMinutes,
  }));
  const studyDayCount = new Set(matchedLogs.map((log) => log.studiedOn)).size;
  const examsInPeriod = input.exams
    .filter((exam) => inReport(exam.takenOn, report))
    .slice()
    .sort(
      (a, b) =>
        a.takenOn.localeCompare(b.takenOn) || a.title.localeCompare(b.title, "tr"),
    );
  const subjectRows: SubjectStudyRow[] = periodSummary.bySubject.map((row) => ({
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    questionCount: row.questionCount,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    blankCount: row.blankCount,
    durationMinutes: row.durationMinutes,
  }));
  const comparisons = examComparisons(examsInPeriod);
  const goalRows = goalRowsForPeriod(
    input.goals,
    input.logs,
    input.today,
    report,
    input.period,
  );
  const summary = {
    durationMinutes: periodSummary.durationMinutes,
    questionCount: periodSummary.questionCount,
    studyDayCount,
    examCount: examsInPeriod.length,
  };
  const studyTotals = {
    questionCount: periodSummary.questionCount,
    correctCount: periodSummary.correctCount,
    wrongCount: periodSummary.wrongCount,
    blankCount: periodSummary.blankCount,
    durationMinutes: periodSummary.durationMinutes,
  };

  return {
    studentName: input.studentName,
    periodLabel: rangeLabel(report),
    periodNote:
      input.period === "current" && weeks.unfinished
        ? REPORT_MESSAGES.unfinishedWeek
        : REPORT_MESSAGES.finishedWeek,
    generatedAtLabel: formatIstanbulDateTime(input.generatedAt),
    summary,
    studyRows,
    studyTotals,
    subjectRows,
    examsInPeriod,
    examComparisons: comparisons,
    goalRows,
    evaluation: buildEvaluation({
      summary,
      studyTotals,
      subjectRows,
      examComparisons: comparisons,
      examsInPeriod,
      periodLabel: rangeLabel(report),
    }),
    suggestion: input.suggestion,
    lgsSubjectCodes: LGS_CODES,
  };
}

export function formatOptionalNet(value: number | null): string {
  if (value === null) return "Kayıt yok";
  return formatNet(value);
}

export function formatNetDelta(value: number | null): string {
  if (value === null) return "Karşılaştırma yapılamıyor";
  const formatted = formatNet(value);
  if (value > 0) return `+${formatted}`;
  return formatted;
}

export function formatExamSubjectNet(
  exam: ReportExam,
  code: LgsSubjectCode,
): string {
  return formatOptionalNet(netForCode(exam, code));
}

export function formatExamDate(takenOn: string): string {
  return formatTurkishDate(takenOn);
}
