import { EXAM_TYPE_LABELS } from "@/features/exams/labels";
import { formatNet, type ExamType } from "@/features/exams/net-rules";
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
import { REPORT_EXPLANATIONS, REPORT_MESSAGES } from "./messages";
import { weekWindows, weeklyReportWindow, type WeeklyReportPeriod } from "./periods";
import { PDF_CONTENT_WIDTH, tableWidths, type Block } from "./layout";

export type ReportExam = {
  title: string;
  takenOn: string;
  examType: ExamType;
  totalNet: number;
  ruleVersion: string;
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

const BODY = 11;
const TITLE = 18;
const SECTION = 13;

function text(value: string, size = BODY, bold = false): Block {
  return { kind: "text", text: value, size, bold };
}

function spacer(height = 8): Block {
  return { kind: "spacer", height };
}

function inReport(date: string, window: DateWindow): boolean {
  return date >= window.from && date <= window.to;
}

/** Drop characters a PDF standard font would reject. The caller still draws with Nunito. */
export function pdfPlain(value: string, fallback: string): string {
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[^\p{Script=Latin}\p{N} .,:'’()\-/+%]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 80) || fallback;
}

function rangeLabel(window: DateWindow): string {
  return formatTurkishDateRange(window).replaceAll("–", "-");
}

function goalRows(
  goals: readonly StudyGoalView[],
  logs: readonly StudyLogView[],
  today: string,
  report: DateWindow,
  period: WeeklyReportPeriod,
): string[][] {
  const rows: string[][] = [];
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
    rows.push([
      `${kind}: ${scope}`,
      rangeLabel({ from, to }),
      `${done} soru`,
      `${goal.targetQuestions} soru`,
    ]);
  }
  return rows;
}

function table(
  headers: readonly string[],
  weights: readonly number[],
  rows: string[][],
): Block {
  const widths = tableWidths(weights);
  const widthSum = widths.reduce((sum, width) => sum + width, 0);
  if (Math.abs(widthSum - PDF_CONTENT_WIDTH) > 0.01) {
    throw new Error("Report table is wider than the page.");
  }
  return {
    kind: "table",
    size: BODY,
    columns: headers.map((header, index) => ({ header, width: widths[index] ?? 0 })),
    rows,
  };
}

/**
 * Weekly report body. Dates, units, and the rule notes are part of the text.
 * The period comes from `today` and `period`, not from a client-supplied range.
 */
export function buildWeeklyReportBlocks(input: WeeklyReportInput): Block[] {
  const report = weeklyReportWindow(input.today, input.period);
  const summary = summarizeLogs(input.logs, report);
  const weeks = weekWindows(input.today);
  const blocks: Block[] = [
    text("Haftalık gelişim raporu", TITLE, true),
    spacer(6),
    text(`Öğrenci: ${pdfPlain(input.studentName, "Öğrenci")}`),
    text(`Üretim: ${formatIstanbulDateTime(input.generatedAt)}`),
    text(`Dönem: ${rangeLabel(report)}`),
    text(
      input.period === "current" && weeks.unfinished
        ? REPORT_MESSAGES.unfinishedWeek
        : REPORT_MESSAGES.finishedWeek,
    ),
    spacer(10),
    text("Ölçüler ne anlama gelir?", SECTION, true),
    ...REPORT_EXPLANATIONS.map((line) => text(line)),
    spacer(10),
    text("Çalışma özeti", SECTION, true),
    text(
      `${summary.questionCount} soru, ${summary.correctCount} doğru, ${summary.wrongCount} yanlış, ${summary.blankCount} boş, ${summary.durationMinutes} dakika.`,
    ),
    text(`Aralık: ${rangeLabel(report)}. Birim: soru ve dakika.`),
  ];

  if (input.period === "current") {
    const previous = summarizeLogs(input.logs, weeks.previous);
    blocks.push(
      text(
        `Bu hafta (${rangeLabel(report)}): ${summary.questionCount} soru, ${summary.durationMinutes} dakika. Geçen hafta (${rangeLabel(weeks.previous)}): ${previous.questionCount} soru, ${previous.durationMinutes} dakika. ${REPORT_MESSAGES.comparisonNote}`,
      ),
    );
  }

  blocks.push(spacer(8), text("Derslere göre", SECTION, true));
  if (summary.bySubject.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noSubjects));
  } else {
    blocks.push(
      table(
        ["Ders", "Soru", "Dakika"],
        [3, 1, 1],
        summary.bySubject.map((row) => [
          pdfPlain(row.subjectName, "Ders"),
          `${row.questionCount} soru`,
          `${row.durationMinutes} dakika`,
        ]),
      ),
    );
  }

  blocks.push(
    spacer(8),
    text("Hedefler", SECTION, true),
    text(REPORT_MESSAGES.goalCountNote),
  );
  if (input.period === "previous") blocks.push(text(REPORT_MESSAGES.dailyGoalSkipped));
  const goals = goalRows(input.goals, input.logs, input.today, report, input.period);
  if (goals.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noGoals));
  } else {
    blocks.push(
      table(["Hedef", "Sayılan aralık", "Yapılan", "Hedeflenen"], [2, 2, 1, 1], goals),
    );
  }

  const exams = input.exams
    .filter((exam) => inReport(exam.takenOn, report))
    .sort(
      (a, b) =>
        a.takenOn.localeCompare(b.takenOn) || a.title.localeCompare(b.title, "tr"),
    );
  blocks.push(spacer(8), text("Denemeler", SECTION, true));
  if (exams.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noExams));
  } else {
    blocks.push(
      table(
        ["Deneme", "Tarih", "Tür", "Toplam net"],
        [2, 1.4, 1.4, 1],
        exams.map((exam) => [
          pdfPlain(exam.title, "Deneme"),
          formatTurkishDate(exam.takenOn),
          EXAM_TYPE_LABELS[exam.examType],
          `${formatNet(exam.totalNet)} net (${exam.ruleVersion})`,
        ]),
      ),
    );
  }

  blocks.push(
    spacer(8),
    text("Öneri", SECTION, true),
    text(input.suggestion.message),
    text(input.suggestion.reason),
    ...input.suggestion.evidence.map((line) => text(line)),
    text(REPORT_MESSAGES.parentSuggestionNote),
  );

  return blocks;
}
