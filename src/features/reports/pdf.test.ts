import { describe, expect, it } from "vitest";
import { buildWeeklyReportBlocks } from "./document";
import { isDownloadablePdf } from "./bytes";
import { layoutBlocks, tableWidths, type Measure } from "./layout";
import { pdfContainsText, pdfPageCount } from "./pdf-text";
import { renderReportPdf } from "./pdf";

describe("weekly report PDF", () => {
  it("embeds the Turkish letters used in the report", async () => {
    const bytes = await renderReportPdf(
      buildWeeklyReportBlocks({
        studentName: "Şişli Ğüşıöç",
        generatedAt: new Date("2026-10-21T07:55:00.000Z"),
        period: "current",
        today: "2026-10-21",
        logs: [],
        goals: [],
        exams: [] as const,
        suggestion: {
          message: "Bugün için küçük bir soru hedefi belirleyebilirsin.",
          reason: "Bu bir ders sonucu değil.",
          evidence: ["Kayıt yok."],
        },
      }),
    );
    expect(isDownloadablePdf(bytes)).toBe(true);
    expect(bytes[0]).toBe("%".charCodeAt(0));
    expect(pdfContainsText(bytes, "Şişli Ğüşıöç")).toBe(true);
    expect(pdfContainsText(bytes, "İstanbul")).toBe(true);
    expect(pdfPageCount(bytes)).toBeGreaterThanOrEqual(1);
  });

  it("continues a long table on a second page", async () => {
    const measure: Measure = (value, size) => value.length * size * 0.5;
    const [wide] = tableWidths([1]);
    const laid = layoutBlocks(
      [
        {
          kind: "table",
          size: 11,
          columns: [{ header: "Ders", width: wide ?? 0 }],
          rows: Array.from({ length: 80 }, (_, index) => [`Satır ${index}`]),
        },
      ],
      measure,
    );
    expect(laid.length).toBeGreaterThan(1);
    const bytes = await renderReportPdf([
      {
        kind: "table",
        size: 11,
        columns: [{ header: "Ders", width: wide ?? 0 }],
        rows: Array.from({ length: 80 }, (_, index) => [`Satır ${index} Şğü`]),
      },
    ]);
    expect(pdfPageCount(bytes)).toBeGreaterThan(1);
    expect(pdfContainsText(bytes, "Şğü")).toBe(true);
  });
});
