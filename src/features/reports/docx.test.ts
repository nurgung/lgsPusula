import { describe, expect, it } from "vitest";
import { unzip } from "@/features/files/zip";
import type { Block } from "./layout";
import { renderReportDocx } from "./docx";

describe("renderReportDocx", () => {
  it("keeps Turkish text and repeats the table header in the document", () => {
    const blocks: Block[] = [
      { kind: "text", text: "Şişli, İstanbul", size: 18, bold: true },
      { kind: "spacer", height: 8 },
      {
        kind: "table",
        size: 11,
        columns: [
          { header: "Ders", width: 2 },
          { header: "Soru", width: 1 },
        ],
        rows: [
          ["Matematik", "10 soru"],
          ["Türkçe", "4 soru"],
        ],
      },
    ];
    const files = unzip(renderReportDocx(blocks));
    const xml = new TextDecoder().decode(files.get("word/document.xml"));
    expect(xml).toContain("Şişli, İstanbul");
    expect(xml).toContain("Türkçe");
    const header = xml.indexOf(">Ders<");
    const secondRow = xml.lastIndexOf(">Türkçe<");
    expect(header).toBeGreaterThan(0);
    expect(secondRow).toBeGreaterThan(header);
    expect(xml.slice(header, secondRow).includes(">Ders<")).toBe(true);
  });
});
