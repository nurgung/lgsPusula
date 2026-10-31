import { formatIstanbulDateTime } from "@/features/study/calendar";
import { formatExamScore, formatNet } from "@/features/exams/net-rules";
import { REPORT_EXPLANATIONS, REPORT_MESSAGES } from "./messages";
import { PDF_CONTENT_WIDTH, tableWidths, type Block } from "./layout";
import {
  buildWeeklyReportModel,
  formatDurationMinutes,
  formatExamDate,
  formatExamSubjectNet,
  formatMetricOrMissing,
  formatNetDelta,
  formatOptionalNet,
  shortSubjectHeader,
  type ReportExam,
  type ReportSuggestion,
  type WeeklyReportInput,
  type WeeklyReportModel,
} from "./weekly-model";

export type { ReportExam, ReportSuggestion, WeeklyReportInput };

const BODY = 10;
const TITLE = 18;
const SECTION = 13;
const TABLE = 8;

const LINE_COLORS = [
  "navy",
  "teal",
  "blue",
  "orange",
  "purple",
  "green",
] as const;

function text(
  value: string,
  size = BODY,
  bold = false,
  color: "ink" | "navy" | "teal" | "muted" = "ink",
): Block {
  return { kind: "text", text: value, size, bold, color };
}

function spacer(height = 8): Block {
  return { kind: "spacer", height };
}

function pageBreak(): Block {
  return { kind: "page_break" };
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

function metricCards(model: WeeklyReportModel): Block {
  const duration =
    model.summary.durationMinutes === null
      ? "Kayıt yok"
      : formatDurationMinutes(model.summary.durationMinutes);
  return {
    kind: "metrics",
    items: [
      { label: "Toplam çalışma süresi", value: duration },
      {
        label: "Çözülen toplam soru",
        value: formatMetricOrMissing(model.summary.questionCount, " soru"),
      },
      {
        label: "Doğru soru",
        value: formatMetricOrMissing(model.summary.correctCount),
      },
      {
        label: "Yanlış soru",
        value: formatMetricOrMissing(model.summary.wrongCount),
      },
      {
        label: "Boş soru",
        value: formatMetricOrMissing(model.summary.blankCount),
      },
      {
        label: "Çalışılan gün",
        value: formatMetricOrMissing(model.summary.studyDayCount, " gün"),
      },
      {
        label: "Girilen deneme",
        value: `${model.summary.examCount} deneme`,
      },
      {
        label: "Son deneme toplam neti",
        value:
          model.summary.lastExamTotalNet === null
            ? "Kayıt yok"
            : formatNet(model.summary.lastExamTotalNet),
      },
    ],
  };
}

function studySection(model: WeeklyReportModel): Block[] {
  const blocks: Block[] = [
    text("2. Derslere göre çalışma analizi", SECTION, true, "navy"),
    spacer(4),
  ];
  if (model.studyRows.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noSubjects, BODY, false, "muted"));
    return blocks;
  }
  blocks.push(
    table(
      ["Tarih", "Gün", "Ders", "Toplam", "Doğru", "Yanlış", "Boş", "Süre"],
      [1.5, 1.2, 1.6, 0.7, 0.7, 0.75, 0.6, 0.9],
      [
        ...model.studyRows.map((row) => [
          formatExamDate(row.studiedOn),
          row.dayName,
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
          "",
          String(model.studyTotals.questionCount),
          String(model.studyTotals.correctCount),
          String(model.studyTotals.wrongCount),
          String(model.studyTotals.blankCount),
          `${model.studyTotals.durationMinutes} dk`,
        ],
      ],
    ),
    spacer(8),
    text("Ders bazında toplamlar", BODY, true, "navy"),
    spacer(4),
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
    spacer(8),
    {
      kind: "bar_chart",
      title: "Derslere göre çözülen soru sayısı",
      unit: "soru",
      bars: model.subjectQuestionBars,
      emptyMessage: REPORT_MESSAGES.noSubjects,
    },
  );
  return blocks;
}

function examTableSection(model: WeeklyReportModel): Block[] {
  const blocks: Block[] = [
    text("3. Deneme sınavları analizi", SECTION, true, "navy"),
    spacer(4),
  ];
  if (model.examsInPeriod.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noExams, BODY, false, "muted"));
    return blocks;
  }
  const subjectHeaders = model.lgsSubjectCodes.map((code) => shortSubjectHeader(code));
  blocks.push(
    table(
      ["Tarih", "Deneme", ...subjectHeaders, "Toplam", "Puan"],
      [1.2, 1.5, 0.7, 0.65, 0.6, 0.6, 0.55, 0.55, 0.75, 0.9],
      model.examsInPeriod.map((exam) => [
        formatExamDate(exam.takenOn),
        pdfPlain(exam.title, "Deneme"),
        ...model.lgsSubjectCodes.map((code) => formatExamSubjectNet(exam, code)),
        formatNet(exam.totalNet),
        formatExamScore(exam.score),
      ]),
    ),
    spacer(8),
  );
  if (!model.canCompareExams) {
    blocks.push(text(REPORT_MESSAGES.singleExamNote, BODY, false, "muted"), spacer(6));
  }
  blocks.push({
    kind: "line_chart",
    title: "Grafik A — Toplam net gelişimi",
    yLabel: "Net",
    showPointLabels: true,
    emptyMessage: model.hasExamData
      ? REPORT_MESSAGES.singleExamNote
      : REPORT_MESSAGES.noExams,
    series:
      model.canCompareExams || model.examsInPeriod.length === 1
        ? [
            {
              id: "total",
              label: "Toplam net",
              color: "navy",
              points: model.totalNetTrend,
            },
          ]
        : [],
  });
  // Single exam: show the point but evaluation already says no trend interpretation.
  if (model.examsInPeriod.length === 1) {
    blocks.push(
      spacer(4),
      text(
        "Tek veri noktası gösterilir; gelişim eğrisi yorumu yapılmaz.",
        BODY,
        false,
        "muted",
      ),
    );
  }
  blocks.push(spacer(8));
  if (model.scoreTrend.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noScoreTrend, BODY, false, "muted"));
  } else {
    blocks.push({
      kind: "line_chart",
      title: "Grafik C — Deneme puanı gelişimi",
      yLabel: "Puan",
      showPointLabels: true,
      emptyMessage: REPORT_MESSAGES.noScoreTrend,
      series: [
        {
          id: "score",
          label: "Deneme puanı",
          color: "teal",
          points: model.scoreTrend,
        },
      ],
    });
  }
  return blocks;
}

function subjectGrowthSection(model: WeeklyReportModel): Block[] {
  const blocks: Block[] = [
    text("4. Ders bazında gelişim", SECTION, true, "navy"),
    spacer(4),
  ];
  if (!model.hasExamData) {
    blocks.push(text(REPORT_MESSAGES.noExams, BODY, false, "muted"));
    return blocks;
  }
  if (!model.canCompareExams) {
    blocks.push(text(REPORT_MESSAGES.singleExamNote, BODY, false, "muted"));
  }

  const half = Math.ceil(model.subjectNetTrends.length / 2) || 1;
  const groups = [
    model.subjectNetTrends.slice(0, half),
    model.subjectNetTrends.slice(half),
  ].filter((group) => group.length > 0);

  if (groups.length === 0) {
    blocks.push(text("Ders neti eğrisi için kayıt yok.", BODY, false, "muted"));
  } else {
    groups.forEach((group, index) => {
      blocks.push(
        {
          kind: "line_chart",
          title:
            groups.length === 1
              ? "Grafik B — Derslere göre net gelişimi"
              : `Grafik B${index + 1} — Derslere göre net gelişimi`,
          yLabel: "Net",
          showPointLabels: false,
          emptyMessage: REPORT_MESSAGES.singleExamNote,
          series: group.map((line, lineIndex) => ({
            id: line.id,
            label: line.label,
            color: LINE_COLORS[lineIndex % LINE_COLORS.length]!,
            points: line.points.filter((point) => Number.isFinite(point.value)),
          })),
        },
        spacer(6),
      );
    });
  }

  if (model.examComparisons.length === 0) {
    blocks.push(text("Karşılaştırılacak ders neti yok.", BODY, false, "muted"));
  } else {
    blocks.push(
      text("Önceki denemeye göre ders neti değişimi", BODY, true, "navy"),
      spacer(4),
      table(
        ["Ders", "Son net", "Önceki", "Değişim", "Değerlendirme"],
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
  return blocks;
}

function outcomeSection(model: WeeklyReportModel): Block[] {
  const blocks: Block[] = [
    text("5. Kazanım analizi — öğrenme eksiklikleri", SECTION, true, "navy"),
    spacer(4),
  ];
  if (model.outcomeGaps.length === 0) {
    blocks.push(text(REPORT_MESSAGES.noOutcomes, BODY, false, "muted"));
  } else {
    blocks.push(
      table(
        ["Ders", "Kod", "Kazanım açıklaması", "Yanlış", "Boş", "Toplam", "Öncelik"],
        [1.3, 1.1, 2.4, 0.7, 0.6, 0.7, 0.9],
        model.outcomeGaps.map((row) => [
          pdfPlain(row.subjectName, "Ders"),
          pdfPlain(row.outcomeCode, "-"),
          pdfPlain(row.outcomeDescription, "-"),
          String(row.wrongCount),
          String(row.blankCount),
          String(row.totalGap),
          row.priority ? "Öncelikli" : "",
        ]),
      ),
      spacer(6),
      text(
        "Öncelikli satırlar, dönemde en fazla eksik görülen bağlı kazanımlardır.",
        BODY,
        false,
        "muted",
      ),
    );
  }

  blocks.push(
    spacer(8),
    text("6. Deneme neti ile kazanım eksiklerinin birlikte okunması", SECTION, true, "navy"),
    spacer(4),
    text(
      "Aşağıdaki notlar aynı dönemdeki gözlemleri bir arada gösterir. Kesin nedensellik iddia edilmez.",
      BODY,
      false,
      "muted",
    ),
    spacer(4),
  );
  if (model.outcomeNetLinks.length === 0) {
    blocks.push(
      text(
        "Bu bölüm için birlikte okunacak net değişimi veya bağlı kazanım kaydı yok.",
        BODY,
        false,
        "muted",
      ),
    );
  } else {
    for (const link of model.outcomeNetLinks) {
      blocks.push(
        text(pdfPlain(link.subjectName, "Ders"), BODY, true, "navy"),
        text(link.note),
      );
      if (link.topGaps.length > 0) {
        blocks.push(
          text(`Bağlı eksikler: ${link.topGaps.join("; ")}`, BODY, false, "muted"),
        );
      }
      blocks.push(spacer(4));
    }
  }
  return blocks;
}

function evaluationSection(model: WeeklyReportModel, input: WeeklyReportInput): Block[] {
  const periodWord = model.scope === "week" ? "Haftalık" : "Aylık";
  const blocks: Block[] = [
    text(`7. ${periodWord} değerlendirme ve sonraki dönem önerileri`, SECTION, true, "navy"),
    spacer(4),
    ...model.evaluation.map((line) => text(line)),
    spacer(6),
  ];

  if (model.scope === "week") {
    blocks.push(text("Hedef ve gerçekleşme", BODY, true, "navy"), spacer(2));
    blocks.push(text(REPORT_MESSAGES.goalCountNote));
    if (input.period === "previous") blocks.push(text(REPORT_MESSAGES.dailyGoalSkipped));
    if (model.goalRows.length === 0) {
      blocks.push(text(REPORT_MESSAGES.noGoals));
    } else {
      blocks.push(
        spacer(4),
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
  } else {
    blocks.push(text(REPORT_MESSAGES.noMonthGoals, BODY, false, "muted"));
  }

  blocks.push(
    spacer(8),
    text("Koçluk önerisi", BODY, true, "navy"),
    spacer(2),
    text(input.suggestion.message),
    text(input.suggestion.reason),
    ...input.suggestion.evidence.map((line) => text(line)),
    text(REPORT_MESSAGES.parentSuggestionNote, BODY, false, "muted"),
    spacer(8),
    text("Ölçüler ne anlama gelir?", BODY, true, "navy"),
    spacer(2),
    ...REPORT_EXPLANATIONS.map((line) => text(line)),
  );
  return blocks;
}

/**
 * Academic report body for week or month. Dates, units, and the rule notes are part of the text.
 * The period comes from `today`, `scope`, and `period`, not from a client-supplied range.
 */
export function buildWeeklyReportBlocks(input: WeeklyReportInput): Block[] {
  const model = buildWeeklyReportModel(input);
  const student = pdfPlain(input.studentName, "Öğrenci");
  const intensity =
    model.hasStudyData && model.summary.studyDayCount !== null
      ? `${model.summary.studyDayCount} günde ${model.studyTotals.questionCount} soru, ${formatDurationMinutes(model.studyTotals.durationMinutes)}.`
      : "Bu dönemde çalışma kaydı yok.";

  return [
    text(model.title, TITLE, true, "navy"),
    spacer(4),
    text(`Öğrenci: ${student}`),
    text(`Dönem: ${model.periodLabel}`),
    text(`Üretim: ${formatIstanbulDateTime(input.generatedAt)}`),
    text(model.periodNote, BODY, false, "muted"),
    spacer(10),
    text(
      model.scope === "month" ? "1. Aylık genel bakış" : "1. Haftalık genel bakış",
      SECTION,
      true,
      "navy",
    ),
    spacer(6),
    metricCards(model),
    spacer(10),
    text("Çalışma yoğunluğu", BODY, true, "navy"),
    text(intensity),
    spacer(6),
    text("Kısa değerlendirme", BODY, true, "navy"),
    ...(model.evaluation.slice(0, 3).map((line) => text(line))),
    pageBreak(),
    ...studySection(model),
    pageBreak(),
    ...examTableSection(model),
    pageBreak(),
    ...subjectGrowthSection(model),
    pageBreak(),
    ...outcomeSection(model),
    pageBreak(),
    ...evaluationSection(model, input),
  ];
}

export function reportPdfMeta(model: WeeklyReportModel): {
  headerTitle: string;
  headerSubtitle: string;
} {
  return {
    headerTitle: "LGS Pusula",
    headerSubtitle: `${model.title} · ${model.studentName} · ${model.periodLabel}`,
  };
}
