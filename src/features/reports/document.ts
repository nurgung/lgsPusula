import { formatIstanbulDateTime } from "@/features/study/calendar";
import { REPORT_EXPLANATIONS, REPORT_MESSAGES } from "./messages";
import { PDF_CONTENT_WIDTH, tableWidths, type Block } from "./layout";
import {
  buildWeeklyReportModel,
  formatDurationMinutes,
  formatExamDate,
  formatExamSubjectNet,
  formatNetDelta,
  formatOptionalNet,
  shortSubjectHeader,
  type ReportExam,
  type ReportSuggestion,
  type WeeklyReportInput,
} from "./weekly-model";
import { formatExamScore, formatNet } from "@/features/exams/net-rules";

export type { ReportExam, ReportSuggestion, WeeklyReportInput };

const BODY = 11;
const TITLE = 16;
const SECTION = 12;
const TABLE = 9;

function text(value: string, size = BODY, bold = false): Block {
  return { kind: "text", text: value, size, bold };
}

function spacer(height = 8): Block {
  return { kind: "spacer", height };
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

function table(
  headers: readonly string[],
  weights: readonly number[],
  rows: string[][],
  size = TABLE,
): Block {
  const widths = tableWidths(weights);
  const widthSum = widths.reduce((sum, width) => sum + width, 0);
  if (Math.abs(widthSum - PDF_CONTENT_WIDTH) > 0.01) {
    throw new Error("Report table is wider than the page.");
  }
  return {
    kind: "table",
    size,
    columns: headers.map((header, index) => ({ header, width: widths[index] ?? 0 })),
    rows,
  };
}

/**
 * Weekly report body. Dates, units, and the rule notes are part of the text.
 * The period comes from `today` and `period`, not from a client-supplied range.
 */
export function buildWeeklyReportBlocks(input: WeeklyReportInput): Block[] {
  const model = buildWeeklyReportModel(input);
  const student = pdfPlain(input.studentName, "Öğrenci");
  const blocks: Block[] = [
    text("Haftalık gelişim raporu", TITLE, true),
    spacer(4),
    text(`Öğrenci: ${student}`),
    text(`Dönem: ${model.periodLabel}`),
    text(`Üretim: ${formatIstanbulDateTime(input.generatedAt)}`),
    text(model.periodNote),
    spacer(8),
    text("Özet", SECTION, true),
    table(
      ["Ölçü", "Değer"],
      [2, 3],
      [
        ["Toplam çalışma süresi", formatDurationMinutes(model.summary.durationMinutes)],
        ["Çözülen toplam soru", `${model.summary.questionCount} soru`],
        ["Çalışma günü", `${model.summary.studyDayCount} gün`],
        ["Deneme sayısı", `${model.summary.examCount} deneme`],
      ],
      BODY,
    ),
    spacer(8),
    text("Haftalık çalışma kayıtları", SECTION, true),
  ];

  if (model.studyRows.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noSubjects));
  } else {
    blocks.push(
      table(
        ["Tarih", "Ders", "Soru", "Doğru", "Yanlış", "Boş", "Süre"],
        [1.6, 1.8, 0.7, 0.7, 0.8, 0.6, 1.1],
        [
          ...model.studyRows.map((row) => [
            formatExamDate(row.studiedOn),
            pdfPlain(row.subjectName, "Ders"),
            String(row.questionCount),
            String(row.correctCount),
            String(row.wrongCount),
            String(row.blankCount),
            `${row.durationMinutes} dk`,
          ]),
          [
            "Toplam",
            "",
            String(model.studyTotals.questionCount),
            String(model.studyTotals.correctCount),
            String(model.studyTotals.wrongCount),
            String(model.studyTotals.blankCount),
            `${model.studyTotals.durationMinutes} dk`,
          ],
        ],
      ),
      spacer(6),
      text("Derslere göre çalışma özeti", SECTION, true),
      table(
        ["Ders", "Soru", "Doğru", "Yanlış", "Boş", "Süre"],
        [2.2, 0.9, 0.9, 0.9, 0.8, 1.2],
        model.subjectRows.map((row) => [
          pdfPlain(row.subjectName, "Ders"),
          String(row.questionCount),
          String(row.correctCount),
          String(row.wrongCount),
          String(row.blankCount),
          `${row.durationMinutes} dk`,
        ]),
      ),
    );
  }

  blocks.push(spacer(8), text("Haftalık deneme sonuçları", SECTION, true));
  if (model.examsInPeriod.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noExams));
  } else {
    const subjectHeaders = model.lgsSubjectCodes.map((code) => shortSubjectHeader(code));
    blocks.push(
      table(
        ["Deneme", "Tarih", ...subjectHeaders, "Toplam", "Puan"],
        [1.6, 1.2, 0.7, 0.65, 0.6, 0.6, 0.55, 0.55, 0.75, 0.9],
        model.examsInPeriod.map((exam) => [
          pdfPlain(exam.title, "Deneme"),
          formatExamDate(exam.takenOn),
          ...model.lgsSubjectCodes.map((code) => formatExamSubjectNet(exam, code)),
          formatNet(exam.totalNet),
          formatExamScore(exam.score),
        ]),
      ),
    );
    if (model.examComparisons.length === 0) {
      blocks.push(text("Karşılaştırılacak ders neti yok."));
    } else {
      blocks.push(
        spacer(6),
        text("Denemelerde ders bazlı performans", SECTION, true),
        table(
          ["Ders", "Son net", "Önceki net", "Değişim", "Değerlendirme"],
          [2, 1, 1.1, 1.2, 1.6],
          model.examComparisons.map((row) => [
            pdfPlain(row.subjectName, "Ders"),
            formatOptionalNet(row.latestNet),
            formatOptionalNet(row.previousNet),
            formatNetDelta(row.delta),
            row.assessment,
          ]),
        ),
      );
    }
  }

  blocks.push(
    spacer(8),
    text("Haftalık hedef ve gerçekleşme", SECTION, true),
    text(REPORT_MESSAGES.goalCountNote),
  );
  if (input.period === "previous") blocks.push(text(REPORT_MESSAGES.dailyGoalSkipped));
  if (model.goalRows.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noGoals));
  } else {
    blocks.push(
      table(
        ["Hedef", "Hedeflenen", "Gerçekleşen", "Oran"],
        [2.6, 1.1, 1.2, 1],
        model.goalRows.map((row) => [
          pdfPlain(row.label, "Hedef"),
          `${row.targetQuestions} soru`,
          `${row.doneQuestions} soru`,
          row.ratioLabel,
        ]),
      ),
    );
  }

  blocks.push(
    spacer(8),
    text("Haftalık değerlendirme", SECTION, true),
    ...model.evaluation.map((line) => text(line)),
    spacer(6),
    text("Ölçüler ne anlama gelir?", SECTION, true),
    ...REPORT_EXPLANATIONS.map((line) => text(line)),
    spacer(6),
    text("Öneri", SECTION, true),
    text(input.suggestion.message),
    text(input.suggestion.reason),
    ...input.suggestion.evidence.map((line) => text(line)),
    text(REPORT_MESSAGES.parentSuggestionNote),
  );

  return blocks;
}
