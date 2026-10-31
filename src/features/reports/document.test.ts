import { describe, expect, it } from "vitest";
import { supportiveCopyIssues } from "@/features/coaching/messages";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";
import { buildWeeklyReportBlocks } from "./document";
import {
  blockPlainText,
  layoutBlocks,
  PDF_PAGE,
  tableWidths,
  wrapText,
  type Measure,
} from "./layout";
import { reportCopyIssues } from "./messages";
import type { ReportExam } from "./weekly-model";

const today = "2026-10-21";

function log(
  partial: Pick<
    StudyLogView,
    | "studiedOn"
    | "questionCount"
    | "correctCount"
    | "wrongCount"
    | "blankCount"
    | "durationMinutes"
  > & { subjectName?: string; subjectId?: string; id?: string },
): StudyLogView {
  return {
    id: partial.id ?? `${partial.studiedOn}-${partial.subjectName ?? "Türkçe"}`,
    studiedOn: partial.studiedOn,
    subjectId: partial.subjectId ?? "sub-1",
    subjectName: partial.subjectName ?? "Türkçe",
    topicId: null,
    topicName: null,
    outcomeId: null,
    outcomeCode: null,
    questionCount: partial.questionCount,
    correctCount: partial.correctCount,
    wrongCount: partial.wrongCount,
    blankCount: partial.blankCount,
    durationMinutes: partial.durationMinutes,
  };
}

const goals: StudyGoalView[] = [
  {
    id: "day",
    period: "day",
    subjectId: null,
    subjectName: null,
    targetQuestions: 5,
  },
  {
    id: "week",
    period: "week",
    subjectId: null,
    subjectName: null,
    targetQuestions: 20,
  },
];

const exams: ReportExam[] = [
  {
    title: "Ekim denemesi",
    takenOn: "2026-10-20",
    examType: "branch",
    totalNet: 5,
    score: 380.5,
    ruleVersion: "lgs-v1",
    subjects: [{ subjectCode: "matematik", subjectName: "Matematik", net: 5 }],
  },
  {
    title: "Eski deneme",
    takenOn: "2026-10-13",
    examType: "lgs_full",
    totalNet: 40,
    score: null,
    ruleVersion: "lgs-v1",
    subjects: [
      { subjectCode: "turkce", subjectName: "Türkçe", net: 10 },
      { subjectCode: "matematik", subjectName: "Matematik", net: 8 },
      { subjectCode: "fen_bilimleri", subjectName: "Fen Bilimleri", net: 7 },
      { subjectCode: "inkilap_tarihi", subjectName: "İnkılap", net: 5 },
      { subjectCode: "din_kulturu", subjectName: "Din", net: 5 },
      { subjectCode: "ingilizce", subjectName: "İngilizce", net: 5 },
    ],
  },
];

const suggestion = {
  message: "Bugün için küçük bir soru hedefi belirleyebilirsin.",
  reason: "Bu bir ders sonucu değil.",
  evidence: ["21 Ekim 2026 için günlük hedef satırı yok."],
};

function blocksFor(name: string, period: "current" | "previous" = "current") {
  return buildWeeklyReportBlocks({
    studentName: name,
    generatedAt: new Date("2026-10-21T07:55:00.000Z"),
    period,
    today,
    logs: [
      log({
        studiedOn: "2026-10-20",
        questionCount: 10,
        correctCount: 8,
        wrongCount: 1,
        blankCount: 1,
        durationMinutes: 30,
      }),
      log({
        id: "same-day-2",
        studiedOn: "2026-10-20",
        subjectId: "sub-1",
        subjectName: "Türkçe",
        questionCount: 2,
        correctCount: 1,
        wrongCount: 1,
        blankCount: 0,
        durationMinutes: 5,
      }),
      log({
        studiedOn: "2026-10-13",
        questionCount: 2,
        correctCount: 1,
        wrongCount: 1,
        blankCount: 0,
        durationMinutes: 10,
      }),
    ],
    goals,
    exams,
    suggestion,
  });
}

describe("weekly report document", () => {
  it("keeps summary cards aligned with study rows and skips missing exam scores", () => {
    const text = blockPlainText(blocksFor("Şişli Öğrencisi"));
    expect(text).toContain("Şişli Öğrencisi");
    expect(text).toContain("19 Ekim 2026 - 21 Ekim 2026");
    expect(text).toContain("12 soru");
    expect(text).toContain("1 gün");
    expect(text).toContain("1 deneme");
    expect(text).toContain("35 dakika");
    expect(text).toContain("Derslere göre çalışma analizi");
    expect(text).toContain("Toplam   12 9 2 1 35 dk");
    expect(text).toContain("Salı");
    expect(text).toContain("Ekim denemesi");
    expect(text).not.toContain("Eski deneme");
    expect(text).toContain("380,5");
    expect(text).toContain("Kayıt yok");
    expect(text).toContain("5,00");
    expect(text).toContain("Tek deneme");
    expect(text).toContain("Günlük hedef");
    expect(text).toContain("20 soru");
    expect(text).toContain("Haftalık değerlendirme");
    expect(text).toContain("Grafik A");
    expect(supportiveCopyIssues(text)).toEqual([]);
    expect(reportCopyIssues()).toEqual([]);
  });

  it("uses the previous full week and skips today's daily goal", () => {
    const text = blockPlainText(blocksFor("Şişli Öğrencisi", "previous"));
    expect(text).toContain("2 soru");
    expect(text).toContain("10 dakika");
    expect(text).not.toContain("12 soru");
    expect(text).toContain("Eski deneme");
    expect(text).not.toContain("Ekim denemesi");
    expect(text).not.toContain("Günlük hedef:");
    expect(text).toContain("Haftalık hedef");
  });

  it("replaces a name the report cannot draw with a plain label", () => {
    expect(blockPlainText(blocksFor("🔥"))).toContain("Öğrenci: Öğrenci");
  });

  it("keeps empty periods free of invented zero-filled exam rows", () => {
    const text = blockPlainText(
      buildWeeklyReportBlocks({
        studentName: "Boş Öğrenci",
        generatedAt: new Date("2026-10-21T07:55:00.000Z"),
        period: "current",
        today,
        logs: [],
        goals: [],
        exams: [],
        suggestion,
      }),
    );
    expect(text).toContain("çalışma kaydı yok");
    expect(text).toContain("deneme yok");
    expect(text).toContain("Kayıt yok");
    expect(text).toContain("0 deneme");
  });

  it("builds a monthly document with the monthly title", () => {
    const text = blockPlainText(
      buildWeeklyReportBlocks({
        studentName: "Ayşe",
        generatedAt: new Date("2026-10-21T07:55:00.000Z"),
        period: "current",
        scope: "month",
        today,
        logs: [
          log({
            studiedOn: "2026-10-05",
            questionCount: 4,
            correctCount: 3,
            wrongCount: 1,
            blankCount: 0,
            durationMinutes: 15,
          }),
        ],
        goals: [],
        exams: [],
        suggestion,
      }),
    );
    expect(text).toContain("Aylık akademik gelişim raporu");
    expect(text).toContain("Aylık genel bakış");
    expect(text).toContain("Aylık hedef yoktur");
  });
});

describe("report layout", () => {
  const measure: Measure = (value, size) => value.length * size * 0.5;

  it("wraps a long Turkish token inside the line and repeats the table header", () => {
    const longName = "Şğüıöç".repeat(30);
    const wrapped = wrapText(longName, 80, 10, false, measure);
    expect(wrapped.length).toBeGreaterThan(1);
    for (const line of wrapped) {
      expect(measure(line, 10, false)).toBeLessThanOrEqual(80);
    }

    const [wide, narrow, narrow2] = tableWidths([3, 1, 1]);
    const rows = Array.from({ length: 80 }, (_, index) => [
      `${longName} ${index}`,
      `${index} soru`,
      "1 dakika",
    ]);
    const pages = layoutBlocks(
      [
        {
          kind: "table",
          size: 10,
          columns: [
            { header: "Ders", width: wide ?? 0 },
            { header: "Soru", width: narrow ?? 0 },
            { header: "Dakika", width: narrow2 ?? 0 },
          ],
          rows,
        },
      ],
      measure,
    );
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[1]?.glyphs.some((glyph) => glyph.text === "Ders")).toBe(true);
    for (const page of pages) {
      for (const glyph of page.glyphs) {
        const width = measure(glyph.text, glyph.size, glyph.bold);
        expect(glyph.x).toBeGreaterThanOrEqual(PDF_PAGE.margin);
        expect(glyph.x + width).toBeLessThanOrEqual(PDF_PAGE.width - PDF_PAGE.margin + 1);
      }
    }
  });
});
