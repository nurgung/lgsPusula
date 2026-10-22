import { describe, expect, it, vi } from "vitest";
import { zipStore } from "@/features/files/zip";
import { isFormulaCell, parseCsv, readImportGrid } from "./grid";
import { extractPdfLines, pdfLinesToGrid } from "./pdf-text";
import { commitPlannedLogs, planStudyImport } from "./plan";

const studentA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const studentB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const math = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const today = "2026-10-22";

const csv = [
  "tarih,ders,soru,dogru,yanlis,bos,sure",
  "2026-10-20,Matematik,10,6,3,1,20",
  "2026-10-21,Matematik,=10,1,0,0,5",
  "2026-10-21,Bilinmeyen,4,1,1,2,10",
].join("\n");

describe("import plan", () => {
  it("keeps a valid row, rejects a formula and an unknown subject, and repeats the same request id", () => {
    const grid = parseCsv(csv);
    const plan = planStudyImport({
      studentId: studentA,
      today,
      subjects: [{ id: math, name: "Matematik" }],
      grid,
    });
    expect(plan.ready).toHaveLength(1);
    expect(plan.ready[0]?.studentId).toBe(studentA);
    expect(plan.ready[0]?.questionCount).toBe(10);
    expect(plan.issues.map((issue) => issue.message)).toEqual([
      "Formül içeren satır alınmaz.",
      "Ders adı listedeki bir dersle aynı değil.",
    ]);
    const again = planStudyImport({
      studentId: studentA,
      today,
      subjects: [{ id: math, name: "Matematik" }],
      grid: parseCsv(csv),
    });
    expect(again.ready[0]?.requestId).toBe(plan.ready[0]?.requestId);
    const other = planStudyImport({
      studentId: studentB,
      today,
      subjects: [{ id: math, name: "Matematik" }],
      grid: parseCsv(
        `tarih,ders,soru,dogru,yanlis,bos,sure\n2026-10-20,Matematik,10,6,3,1,20`,
      ),
    });
    expect(other.ready[0]?.studentId).toBe(studentB);
    expect(other.ready[0]?.requestId).not.toBe(plan.ready[0]?.requestId);
  });

  it("does not treat a student id written in the file as the owner", () => {
    const grid = parseCsv(
      `ogrenci,tarih,ders,soru,dogru,yanlis,bos,sure\n${studentB},2026-10-20,Matematik,10,6,3,1,20`,
    );
    const plan = planStudyImport({
      studentId: studentA,
      today,
      subjects: [{ id: math, name: "Matematik" }],
      grid,
    });
    expect(plan.ready[0]?.studentId).toBe(studentA);
    expect(plan.ready.every((row) => row.studentId !== studentB)).toBe(true);
  });

  it("rejects an oversized file and a formula cell", () => {
    expect(isFormulaCell("=SUM(A1)")).toBe(true);
    const huge = new Uint8Array(500_001);
    expect(readImportGrid(huge).ok).toBe(false);
  });

  it("reads an xlsx sheet and marks a formula row", () => {
    const sheet = `<?xml version="1.0"?>
      <worksheet><sheetData>
        <row><c r="A1" t="inlineStr"><is><t>tarih</t></is></c><c r="B1" t="inlineStr"><is><t>ders</t></is></c><c r="C1" t="inlineStr"><is><t>soru</t></is></c><c r="D1" t="inlineStr"><is><t>dogru</t></is></c><c r="E1" t="inlineStr"><is><t>yanlis</t></is></c><c r="F1" t="inlineStr"><is><t>bos</t></is></c><c r="G1" t="inlineStr"><is><t>sure</t></is></c></row>
        <row><c r="A2" t="inlineStr"><is><t>2026-10-20</t></is></c><c r="B2" t="inlineStr"><is><t>Matematik</t></is></c><c r="C2"><v>10</v></c><c r="D2"><v>6</v></c><c r="E2"><v>3</v></c><c r="F2"><v>1</v></c><c r="G2"><v>20</v></c></row>
        <row><c r="A3"><f>A2</f><v>2026-10-21</v></c></row>
      </sheetData></worksheet>`;
    const packed = zipStore([
      { name: "xl/worksheets/sheet1.xml", data: new TextEncoder().encode(sheet) },
    ]);
    const read = readImportGrid(packed);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const plan = planStudyImport({
      studentId: studentA,
      today,
      subjects: [{ id: math, name: "Matematik" }],
      grid: read.grid,
    });
    expect(plan.ready).toHaveLength(1);
    expect(plan.issues.some((issue) => issue.message.includes("Formül"))).toBe(true);
  });
});

describe("commitPlannedLogs", () => {
  it("writes nothing when a row names another student", async () => {
    const insert = vi.fn();
    const plan = planStudyImport({
      studentId: studentB,
      today,
      subjects: [{ id: math, name: "Matematik" }],
      grid: parseCsv(
        "tarih,ders,soru,dogru,yanlis,bos,sure\n2026-10-20,Matematik,10,6,3,1,20",
      ),
    });
    const result = await commitPlannedLogs(studentA, plan.ready, {
      insert,
      findByRequestId: async () => null,
    });
    expect(result).toEqual({ refused: true });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("pdf text", () => {
  it("reads labeled lines and writes nothing when the text layer is missing", () => {
    const body =
      "BT (tarih: 2026-10-20) Tj (ders: Matematik) Tj (soru: 10) Tj (dogru: 6) Tj (yanlis: 3) Tj (bos: 1) Tj (sure: 20) Tj ET";
    const pdf = new TextEncoder().encode(`%PDF-1.4\nstream\n${body}\nendstream\n%%EOF`);
    const extracted = extractPdfLines(pdf);
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    const grid = pdfLinesToGrid(extracted.lines);
    const plan = planStudyImport({
      studentId: studentA,
      today,
      subjects: [{ id: math, name: "Matematik" }],
      grid,
    });
    expect(plan.ready).toHaveLength(1);
    expect(plan.ready[0]?.studentId).toBe(studentA);

    const empty = extractPdfLines(
      new TextEncoder().encode("%PDF-1.4\nstream\n(no labels)\nendstream"),
    );
    expect(empty.ok).toBe(true);
    if (!empty.ok) return;
    const none = planStudyImport({
      studentId: studentA,
      today,
      subjects: [{ id: math, name: "Matematik" }],
      grid: pdfLinesToGrid(empty.lines),
    });
    expect(none.ready).toEqual([]);
    expect(extractPdfLines(new TextEncoder().encode("not a pdf")).ok).toBe(false);
  });
});
