import { LGS_SUBJECT_LABELS } from "@/features/exams/labels";
import {
  formatNet,
  getNetRule,
  type ExamType,
  type LgsSubjectCode,
  type NetRuleVersion,
} from "@/features/exams/net-rules";
import type { OutcomePriority } from "@/features/outcomes/prioritize";
import {
  formatIstanbulDateTime,
  formatTurkishDate,
  formatTurkishDateRange,
  goalWindow,
  turkishWeekdayName,
  type DateWindow,
} from "@/features/study/calendar";
import {
  questionsInWindow,
  summarizeLogs,
  type StudyGoalView,
  type StudyLogView,
} from "@/features/study/summary";
import { REPORT_MESSAGES } from "./messages";
import {
  monthWindows,
  reportPeriodWindow,
  weekWindows,
  type ReportPeriodChoice,
  type ReportScope,
  type WeeklyReportPeriod,
} from "./periods";

export type { ReportScope, ReportPeriodChoice, WeeklyReportPeriod };

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
  /** Defaults to week so existing weekly callers stay valid. */
  scope?: ReportScope;
  /** Tagged wrong/blank outcomes in the report window only. Never invented. */
  outcomes?: readonly OutcomePriority[];
};

export type StudyDetailRow = {
  studiedOn: string;
  dayName: string;
  subjectId: string;
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
  subjectCode: string;
  subjectName: string;
  latestNet: number | null;
  previousNet: number | null;
  delta: number | null;
  assessment: string;
};

export type OutcomeGapRow = {
  subjectId: string;
  subjectName: string;
  outcomeCode: string;
  outcomeDescription: string;
  wrongCount: number;
  blankCount: number;
  totalGap: number;
  priority: boolean;
};

export type OutcomeNetLinkRow = {
  subjectName: string;
  netDelta: number | null;
  netAssessment: string;
  topGaps: readonly string[];
  note: string;
};

export type ChartSeriesPoint = {
  label: string;
  value: number;
};

export type ChartLineSeries = {
  id: string;
  label: string;
  points: readonly ChartSeriesPoint[];
};

export type WeeklyReportModel = {
  studentName: string;
  scope: ReportScope;
  title: string;
  periodLabel: string;
  periodNote: string;
  generatedAtLabel: string;
  hasStudyData: boolean;
  hasExamData: boolean;
  canCompareExams: boolean;
  summary: {
    durationMinutes: number | null;
    questionCount: number | null;
    correctCount: number | null;
    wrongCount: number | null;
    blankCount: number | null;
    studyDayCount: number | null;
    examCount: number;
    lastExamTotalNet: number | null;
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
  subjectQuestionBars: ChartSeriesPoint[];
  examsInPeriod: ReportExam[];
  examComparisons: ExamComparisonRow[];
  totalNetTrend: ChartSeriesPoint[];
  subjectNetTrends: ChartLineSeries[];
  scoreTrend: ChartSeriesPoint[];
  outcomeGaps: OutcomeGapRow[];
  outcomeNetLinks: OutcomeNetLinkRow[];
  goalRows: GoalProgressRow[];
  evaluation: readonly string[];
  suggestion: ReportSuggestion;
  lgsSubjectCodes: readonly LgsSubjectCode[];
};

const LGS_CODES = getNetRule("lgs-v1").examTypes.lgs_full.subjects.map(
  (slot) => slot.code,
) as LgsSubjectCode[];

const SUBJECT_TREND_COLORS = [
  "turkce",
  "matematik",
  "fen_bilimleri",
  "inkilap_tarihi",
  "din_kulturu",
  "ingilizce",
] as const;

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

function mergeStudyRows(logs: readonly StudyLogView[]): StudyDetailRow[] {
  const merged = new Map<string, StudyDetailRow>();
  for (const log of logs) {
    const key = `${log.studiedOn}|${log.subjectId}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        studiedOn: log.studiedOn,
        dayName: turkishWeekdayName(log.studiedOn),
        subjectId: log.subjectId,
        subjectName: log.subjectName,
        questionCount: log.questionCount,
        correctCount: log.correctCount,
        wrongCount: log.wrongCount,
        blankCount: log.blankCount,
        durationMinutes: log.durationMinutes,
      });
      continue;
    }
    existing.questionCount += log.questionCount;
    existing.correctCount += log.correctCount;
    existing.wrongCount += log.wrongCount;
    existing.blankCount += log.blankCount;
    existing.durationMinutes += log.durationMinutes;
  }
  return [...merged.values()].sort(
    (a, b) =>
      a.studiedOn.localeCompare(b.studiedOn) ||
      a.subjectName.localeCompare(b.subjectName, "tr"),
  );
}

function goalRowsForPeriod(
  goals: readonly StudyGoalView[],
  logs: readonly StudyLogView[],
  today: string,
  report: DateWindow,
  period: WeeklyReportPeriod,
  scope: ReportScope,
): GoalProgressRow[] {
  if (scope === "month") return [];
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
    const scopeLabel = goal.subjectName ?? "Tüm dersler";
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
      label: `${kind}: ${scopeLabel}`,
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
        subjectCode: code,
        subjectName: name,
        latestNet: null,
        previousNet,
        delta: null,
        assessment: "Son denemede kayıt yok",
      };
    }
    if (previousNet === null) {
      return {
        subjectCode: code,
        subjectName: name,
        latestNet,
        previousNet: null,
        delta: null,
        assessment:
          previous === null
            ? "Tek deneme var; karşılaştırma yapılmadı"
            : "Karşılaştırma yapılamıyor",
      };
    }
    const delta = latestNet - previousNet;
    let assessment = "Durağan";
    if (delta > 0) assessment = "Arttı";
    if (delta < 0) assessment = "Azaldı";
    return {
      subjectCode: code,
      subjectName: name,
      latestNet,
      previousNet,
      delta,
      assessment,
    };
  });
}

function outcomeGapRows(outcomes: readonly OutcomePriority[]): OutcomeGapRow[] {
  if (outcomes.length === 0) return [];
  const ranked = [...outcomes].sort(
    (a, b) =>
      b.wrongCount + b.blankCount - (a.wrongCount + a.blankCount) ||
      b.score - a.score ||
      a.outcomeCode.localeCompare(b.outcomeCode, "tr"),
  );
  return ranked.map((row, index) => ({
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    outcomeCode: row.outcomeCode,
    outcomeDescription: row.outcomeDescription,
    wrongCount: row.wrongCount,
    blankCount: row.blankCount,
    totalGap: row.wrongCount + row.blankCount,
    priority: index < 5,
  }));
}

/**
 * Observes co-occurrence of subject net change and tagged gaps in the same period.
 * Does not claim causation.
 */
function outcomeNetLinks(
  comparisons: readonly ExamComparisonRow[],
  gaps: readonly OutcomeGapRow[],
  canCompare: boolean,
): OutcomeNetLinkRow[] {
  if (gaps.length === 0 && comparisons.length === 0) return [];
  const bySubject = new Map<string, OutcomeGapRow[]>();
  for (const gap of gaps) {
    const list = bySubject.get(gap.subjectName) ?? [];
    list.push(gap);
    bySubject.set(gap.subjectName, list);
  }
  const names = new Set<string>([
    ...comparisons.map((row) => row.subjectName),
    ...bySubject.keys(),
  ]);
  const rows: OutcomeNetLinkRow[] = [];
  for (const name of [...names].sort((a, b) => a.localeCompare(b, "tr"))) {
    const comparison = comparisons.find((row) => row.subjectName === name) ?? null;
    const subjectGaps = bySubject.get(name) ?? [];
    const topGaps = subjectGaps
      .slice(0, 3)
      .map((gap) => `${gap.outcomeCode} (${gap.totalGap} eksik)`);
    let note: string;
    if (!canCompare) {
      note =
        subjectGaps.length > 0
          ? "Bu dönemde bağlı kazanım eksikleri var. Tek deneme olduğu için net değişimiyle birlikte yorumlanmadı."
          : "Bu dönemde karşılaştırma için yeterli deneme yok.";
    } else if (comparison?.delta !== null && comparison && comparison.delta < 0 && subjectGaps.length > 0) {
      note = `${name} neti bu dönemde azaldı ve aynı aralıkta bağlı yanlış/boş kazanımlar da görünüyor. Bu bir neden-sonuç iddiası değildir; aynı dönemdeki gözlemlerdir.`;
    } else if (comparison?.delta !== null && comparison && comparison.delta > 0 && subjectGaps.length > 0) {
      note = `${name} neti yükselmiş olsa da bazı kazanımlarda yanlış/boş devam ediyor.`;
    } else if (subjectGaps.length > 0) {
      note = `${name} için bağlı kazanım eksikleri var. Bu dönemde net karşılaştırması durağan veya eksik.`;
    } else if (comparison?.delta !== null && comparison && comparison.delta < 0) {
      note = `${name} neti azaldı; bu dönemde bu derse bağlı kazanım eşleştirmesi yok.`;
    } else {
      continue;
    }
    rows.push({
      subjectName: name,
      netDelta: comparison?.delta ?? null,
      netAssessment: comparison?.assessment ?? "Karşılaştırma yok",
      topGaps,
      note,
    });
  }
  return rows;
}

function buildSubjectNetTrends(exams: readonly ReportExam[]): ChartLineSeries[] {
  if (exams.length === 0) return [];
  const codes = SUBJECT_TREND_COLORS.filter((code) =>
    exams.some((exam) => exam.subjects.some((subject) => subject.subjectCode === code)),
  );
  return codes.map((code) => ({
    id: code,
    label: subjectDisplayName(code),
    points: exams.map((exam) => {
      const net = netForCode(exam, code);
      return {
        label: formatTurkishDate(exam.takenOn),
        value: net ?? Number.NaN,
      };
    }),
  }));
}

function buildEvaluation(input: {
  scope: ReportScope;
  summary: WeeklyReportModel["summary"];
  studyTotals: WeeklyReportModel["studyTotals"];
  subjectRows: SubjectStudyRow[];
  examComparisons: ExamComparisonRow[];
  examsInPeriod: ReportExam[];
  outcomeGaps: OutcomeGapRow[];
  canCompareExams: boolean;
  periodLabel: string;
}): string[] {
  const lines: string[] = [];
  const {
    scope,
    summary,
    studyTotals,
    subjectRows,
    examComparisons,
    examsInPeriod,
    outcomeGaps,
    canCompareExams,
    periodLabel,
  } = input;
  const periodWord = scope === "week" ? "hafta" : "ay";

  if (!input.summary.studyDayCount && summary.examCount === 0) {
    lines.push(
      `Bu dönemde (${periodLabel}) çalışma kaydı ve deneme yok. Kayıt gelince özet burada görünür.`,
    );
    return lines;
  }

  if (summary.studyDayCount && summary.studyDayCount > 0) {
    lines.push(
      `Dönem çalışma özeti: ${summary.studyDayCount} günde ${studyTotals.questionCount} soru, ${formatDurationMinutes(studyTotals.durationMinutes)}.`,
    );
    const byQuestions = [...subjectRows].sort(
      (a, b) =>
        b.questionCount - a.questionCount ||
        a.subjectName.localeCompare(b.subjectName, "tr"),
    );
    const top = byQuestions[0];
    const low = [...byQuestions].reverse().find((row) => row.questionCount > 0);
    if (top && top.questionCount > 0) {
      lines.push(
        `En yoğun çalışılan ders: ${top.subjectName} (${top.questionCount} soru).`,
      );
    }
    if (low && byQuestions.length > 1 && low.subjectName !== top?.subjectName) {
      lines.push(
        `Çalışma yoğunluğu daha düşük görünen ders: ${low.subjectName} (${low.questionCount} soru). Kayıt olmayan dersler listelenmez.`,
      );
    }
  } else {
    lines.push("Bu dönemde çalışma kaydı yok. Soru ve süre toplamı denemelere eklenmez.");
  }

  if (examsInPeriod.length === 0) {
    lines.push("Bu dönemde deneme yok. Ders neti karşılaştırması yapılmadı.");
  } else if (!canCompareExams) {
    lines.push(
      "Bu dönemde tek deneme var. Gelişim veya gerileme yorumu üretilmedi; karşılaştırma için en az iki deneme gerekir.",
    );
  } else {
    const risen = examComparisons.filter((row) => row.delta !== null && row.delta > 0);
    const fallen = examComparisons.filter((row) => row.delta !== null && row.delta < 0);
    const flat = examComparisons.filter((row) => row.delta === 0);
    if (risen.length > 0) {
      lines.push(`Net artışı görülen dersler: ${risen.map((row) => row.subjectName).join(", ")}.`);
    }
    if (fallen.length > 0) {
      lines.push(`Net kaybı görülen dersler: ${fallen.map((row) => row.subjectName).join(", ")}.`);
    }
    if (flat.length > 0) {
      lines.push(`Gelişimi durağan olan dersler: ${flat.map((row) => row.subjectName).join(", ")}.`);
    }
    if (risen.length === 0 && fallen.length === 0 && flat.length === 0) {
      lines.push("Karşılaştırma için ortak ders neti bulunamadı.");
    }
  }

  if (outcomeGaps.length > 0) {
    const top = outcomeGaps.filter((row) => row.priority).slice(0, 3);
    lines.push(
      `Tekrar edilmesi gereken kazanımlar: ${top
        .map((row) => `${row.outcomeCode} (${row.subjectName})`)
        .join(", ")}.`,
    );
  } else {
    lines.push(
      "Bu dönemde yanlış/boş ile bağlı kazanım kaydı yok. Eşleştirilmemiş sorulardan kazanım adı üretilmez.",
    );
  }

  const focus: string[] = [];
  for (const row of examComparisons) {
    if (row.delta !== null && row.delta < 0) focus.push(row.subjectName);
  }
  for (const gap of outcomeGaps.filter((row) => row.priority).slice(0, 2)) {
    focus.push(`${gap.subjectName} · ${gap.outcomeCode}`);
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
      `Sonraki ${periodWord} için öncelikli çalışma önerileri: ${[...new Set(focus)].join(", ")}. Bu bir zorunluluk değil; kayıtlara göre seçim yapılabilir.`,
    );
  } else {
    lines.push(
      `Öncelik önerisi için yeterli karşılaştırma, kazanım veya çalışma kaydı yok. Yeni kayıt gelince burası dolar.`,
    );
  }

  return lines;
}

/**
 * Pure period report body (week or month). Period comes from Istanbul `today`,
 * `scope`, and `period`. Study and exam totals are never mixed.
 */
export function buildWeeklyReportModel(input: WeeklyReportInput): WeeklyReportModel {
  const scope = input.scope ?? "week";
  const report = reportPeriodWindow(input.today, scope, input.period);
  const weeks = weekWindows(input.today);
  const months = monthWindows(input.today);
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
  const studyRows = mergeStudyRows(matchedLogs);
  const hasStudyData = matchedLogs.length > 0;
  const studyDayCount = new Set(matchedLogs.map((log) => log.studiedOn)).size;
  const examsInPeriod = input.exams
    .filter((exam) => inReport(exam.takenOn, report))
    .slice()
    .sort(
      (a, b) =>
        a.takenOn.localeCompare(b.takenOn) || a.title.localeCompare(b.title, "tr"),
    );
  const hasExamData = examsInPeriod.length > 0;
  const canCompareExams = examsInPeriod.length >= 2;
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
    scope,
  );
  const studyTotals = {
    questionCount: periodSummary.questionCount,
    correctCount: periodSummary.correctCount,
    wrongCount: periodSummary.wrongCount,
    blankCount: periodSummary.blankCount,
    durationMinutes: periodSummary.durationMinutes,
  };
  const lastExam = examsInPeriod[examsInPeriod.length - 1] ?? null;
  const summary = {
    durationMinutes: hasStudyData ? studyTotals.durationMinutes : null,
    questionCount: hasStudyData ? studyTotals.questionCount : null,
    correctCount: hasStudyData ? studyTotals.correctCount : null,
    wrongCount: hasStudyData ? studyTotals.wrongCount : null,
    blankCount: hasStudyData ? studyTotals.blankCount : null,
    studyDayCount: hasStudyData ? studyDayCount : null,
    examCount: examsInPeriod.length,
    lastExamTotalNet: lastExam ? lastExam.totalNet : null,
  };
  const outcomeGaps = outcomeGapRows(input.outcomes ?? []);
  const outcomeNetLinksRows = outcomeNetLinks(
    comparisons,
    outcomeGaps,
    canCompareExams,
  );
  const unfinished =
    scope === "week"
      ? input.period === "current" && weeks.unfinished
      : input.period === "current" && months.unfinished;
  const periodNote = unfinished
    ? scope === "week"
      ? REPORT_MESSAGES.unfinishedWeek
      : REPORT_MESSAGES.unfinishedMonth
    : scope === "week"
      ? REPORT_MESSAGES.finishedWeek
      : REPORT_MESSAGES.finishedMonth;

  return {
    studentName: input.studentName,
    scope,
    title:
      scope === "week"
        ? "Haftalık akademik gelişim raporu"
        : "Aylık akademik gelişim raporu",
    periodLabel: rangeLabel(report),
    periodNote,
    generatedAtLabel: formatIstanbulDateTime(input.generatedAt),
    hasStudyData,
    hasExamData,
    canCompareExams,
    summary,
    studyRows,
    studyTotals,
    subjectRows,
    subjectQuestionBars: subjectRows.map((row) => ({
      label: row.subjectName,
      value: row.questionCount,
    })),
    examsInPeriod,
    examComparisons: comparisons,
    totalNetTrend: examsInPeriod.map((exam) => ({
      label: formatTurkishDate(exam.takenOn),
      value: exam.totalNet,
    })),
    subjectNetTrends: buildSubjectNetTrends(examsInPeriod),
    scoreTrend: examsInPeriod
      .filter((exam) => exam.score !== null)
      .map((exam) => ({
        label: formatTurkishDate(exam.takenOn),
        value: exam.score as number,
      })),
    outcomeGaps,
    outcomeNetLinks: outcomeNetLinksRows,
    goalRows,
    evaluation: buildEvaluation({
      scope,
      summary,
      studyTotals,
      subjectRows,
      examComparisons: comparisons,
      examsInPeriod,
      outcomeGaps,
      canCompareExams,
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

/** Formats a metric that may be missing (no study data) versus a real zero. */
export function formatMetricOrMissing(
  value: number | null,
  suffix = "",
): string {
  if (value === null) return "Kayıt yok";
  return `${value}${suffix}`;
}
