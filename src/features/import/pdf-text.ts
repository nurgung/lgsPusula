import { inflateRawSync } from "node:zlib";

const MAX_PDF_BYTES = 500_000;

function unescapePdf(value: string): string {
  return value
    .replaceAll("\\(", "(")
    .replaceAll("\\)", ")")
    .replaceAll("\\n", "\n")
    .replaceAll("\\\\", "\\");
}

function stringsIn(stream: string): string[] {
  const found: string[] = [];
  const pattern = /\((?:\\.|[^\\)])*\)\s*Tj|\[(?:\s*\((?:\\.|[^\\)])*\)\s*)+\]\s*TJ/g;
  for (const match of stream.matchAll(pattern)) {
    const parts = [...match[0].matchAll(/\((?:\\.|[^\\)])*\)/g)].map((item) =>
      unescapePdf((item[0] ?? "").slice(1, -1)),
    );
    const text = parts.join("").trim();
    if (text) found.push(text);
  }
  return found;
}

/**
 * Reads a text layer only. The file is not sent to a model.
 * A PDF without these text operators yields no rows, and nothing is invented.
 */
export function extractPdfLines(
  bytes: Uint8Array,
): { ok: true; lines: string[] } | { ok: false; message: string } {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES) {
    return { ok: false, message: "Dosya boş ya da 500 KB sınırından büyük." };
  }
  const header = new TextDecoder().decode(bytes.subarray(0, 5));
  if (header !== "%PDF-") return { ok: false, message: "Bu dosya PDF değil." };
  const source = new TextDecoder("latin1").decode(bytes);
  const lines: string[] = [];
  const streams = source.matchAll(/stream\r?\n([\s\S]*?)endstream/g);
  for (const match of streams) {
    const raw = match[1] ?? "";
    const blockStart = match.index ?? 0;
    const dict = source.slice(Math.max(0, blockStart - 200), blockStart);
    let text = raw;
    if (dict.includes("/FlateDecode")) {
      try {
        text = new TextDecoder("latin1").decode(
          inflateRawSync(Buffer.from(raw, "latin1")),
        );
      } catch {
        continue;
      }
    }
    lines.push(...stringsIn(text));
  }
  return { ok: true, lines };
}

/** Turns labeled lines into the same grid the spreadsheet importer uses. */
export function pdfLinesToGrid(lines: readonly string[]): string[][] {
  const grid: string[][] = [["tarih", "ders", "soru", "dogru", "yanlis", "bos", "sure"]];
  let current: Record<string, string> = {};
  const flush = () => {
    if (!current.tarih && !current.ders) return;
    grid.push([
      current.tarih ?? "",
      current.ders ?? "",
      current.soru ?? "",
      current.dogru ?? "",
      current.yanlis ?? "",
      current.bos ?? "",
      current.sure ?? "",
    ]);
    current = {};
  };
  for (const line of lines) {
    const match = /^(tarih|ders|soru|dogru|yanlis|bos|sure)\s*:\s*(.+)$/i.exec(
      line.trim(),
    );
    if (!match) continue;
    const key = match[1]!.toLocaleLowerCase("tr-TR");
    if (key === "tarih" && current.tarih) flush();
    current[key] = match[2]!.trim();
  }
  flush();
  return grid;
}
