import { describe, expect, it } from "vitest";
import { supportiveCopyIssues } from "@/features/coaching/messages";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";
import { buildWeeklyReportBlocks, type ReportExam } from "./document";
import {
  blockPlainText,
  layoutBlocks,
  PDF_PAGE,
  tableWidths,
  wrapText,
  type Measure,
} from "./layout";
import { reportCopyIssues } from "./messages";

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
  > & { subjectName?: string },
): StudyLogView {
  return {
    id: partial.studiedOn,
    studiedOn: partial.studiedOn,
    subjectId: "sub-1",
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
    ruleVersion: "lgs-v1",
  },
  {
    title: "Eski deneme",
    takenOn: "2026-10-13",
    examType: "lgs_full",
    totalNet: 40,
    ruleVersion: "lgs-v1",
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
  it("counts only the chosen week and keeps the date, unit, and Turkish name", () => {
    const text = blockPlainText(blocksFor("Şişli Öğrencisi"));
    expect(text).toContain("Şişli Öğrencisi");
    expect(text).toContain("10 soru, 8 doğru, 1 yanlış, 1 boş, 30 dakika");
    expect(text).toContain("Türkçe");
    expect(text).toContain("19 Ekim 2026 - 21 Ekim 2026");
    expect(text).toContain("12 Ekim 2026 - 18 Ekim 2026");
    expect(text).toContain("2 soru, 10 dakika");
    expect(text).toContain("Ekim denemesi");
    expect(text).not.toContain("Eski deneme");
    expect(text).toContain("5,00 net");
    expect(text).toContain("lgs-v1");
    expect(text).toContain("Günlük hedef");
    expect(text).toContain("20 soru");
    expect(supportiveCopyIssues(text)).toEqual([]);
    expect(reportCopyIssues()).toEqual([]);
  });

  it("uses the previous full week and skips today's daily goal", () => {
    const text = blockPlainText(blocksFor("Şişli Öğrencisi", "previous"));
    expect(text).toContain("2 soru, 1 doğru, 1 yanlış, 0 boş, 10 dakika");
    expect(text).not.toContain("10 soru, 8 doğru");
    expect(text).toContain("Eski deneme");
    expect(text).not.toContain("Ekim denemesi");
    expect(text).not.toContain("Günlük hedef:");
    expect(text).toContain("Haftalık hedef");
  });

  it("replaces a name the report cannot draw with a plain label", () => {
    expect(blockPlainText(blocksFor("🔥"))).toContain("Öğrenci: Öğrenci");
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
