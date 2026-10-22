import { unzip, ZipError } from "@/features/files/zip";

export const IMPORT_LIMITS = {
  maxBytes: 500_000,
  maxRows: 100,
} as const;

const FORMULA_START = /^[=+@\t\r-]/;

/** A spreadsheet formula must not be stored or shown as a value. */
export function isFormulaCell(value: string): boolean {
  return FORMULA_START.test(value.trim());
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => line.some((item) => item.trim() !== ""));
}

function sharedStrings(xml: string): string[] {
  const values: string[] = [];
  for (const item of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const parts = [...(item[1] ?? "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(
      (match) => decodeXml(match[1] ?? ""),
    );
    values.push(parts.join(""));
  }
  return values;
}

function columnIndex(cellRef: string): number {
  const letters = /^[A-Z]+/.exec(cellRef)?.[0] ?? "A";
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function sheetGrid(xml: string, strings: readonly string[]): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    let formula = false;
    for (const cellMatch of (rowMatch[1] ?? "").matchAll(
      /<c\b([^>]*)>([\s\S]*?)<\/c>/g,
    )) {
      const attrs = cellMatch[1] ?? "";
      const inner = cellMatch[2] ?? "";
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1] ?? "A";
      const index = columnIndex(ref);
      if (/<f\b/.test(inner)) formula = true;
      const kind = /t="([^"]+)"/.exec(attrs)?.[1] ?? "";
      let value = "";
      if (kind === "inlineStr" || kind === "str") {
        value = decodeXml(/<t\b[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1] ?? "");
      } else if (kind === "s") {
        const pointer = Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "");
        value = strings[pointer] ?? "";
      } else {
        value = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]?.trim() ?? "";
      }
      cells[index] = value;
    }
    if (formula) rows.push(["=formula"]);
    else rows.push(cells.map((cell) => cell ?? ""));
  }
  return rows.filter((line) => line.some((item) => item.trim() !== ""));
}

export type GridResult = { ok: true; grid: string[][] } | { ok: false; message: string };

/** CSV or the first worksheet of an xlsx file. Other types are refused. */
export function readImportGrid(bytes: Uint8Array): GridResult {
  if (bytes.byteLength === 0 || bytes.byteLength > IMPORT_LIMITS.maxBytes) {
    return { ok: false, message: "Dosya boş ya da 500 KB sınırından büyük." };
  }
  const zip =
    bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (!zip) {
    if (bytes.includes(0)) return { ok: false, message: "Bu dosya CSV değil." };
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return { ok: true, grid: parseCsv(text) };
  }
  try {
    const files = unzip(bytes);
    const sheetName =
      [...files.keys()].find((name) => name === "xl/worksheets/sheet1.xml") ??
      [...files.keys()].find((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
    if (!sheetName) return { ok: false, message: "Çalışma sayfası bulunamadı." };
    const strings = sharedStrings(
      new TextDecoder().decode(files.get("xl/sharedStrings.xml") ?? new Uint8Array()),
    );
    return {
      ok: true,
      grid: sheetGrid(
        new TextDecoder().decode(files.get(sheetName) ?? new Uint8Array()),
        strings,
      ),
    };
  } catch (error) {
    if (error instanceof ZipError)
      return { ok: false, message: "Excel dosyası açılamadı." };
    return { ok: false, message: "Excel dosyası açılamadı." };
  }
}
