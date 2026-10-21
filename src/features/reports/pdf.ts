import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as fontkitNamespace from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import { layoutBlocks, PDF_PAGE, type Block, type Measure } from "./layout";

/**
 * The package types a named `create`, but the ESM build used by Next only has a default
 * export. Node's CJS build exposes `create` on the module. Accept either shape.
 */
function loadFontkit(): typeof fontkitNamespace {
  const loaded = fontkitNamespace as typeof fontkitNamespace & {
    default?: typeof fontkitNamespace;
  };
  if (typeof loaded.default?.create === "function") return loaded.default;
  return fontkitNamespace;
}

const INK = rgb(0.12, 0.16, 0.22);

let regularCache: Uint8Array | null = null;
let boldCache: Uint8Array | null = null;

function fontFile(name: string): Uint8Array {
  const file = readFileSync(join(process.cwd(), "src/features/reports/fonts", name));
  // Copy into this realm. A Node Buffer is not a jsdom Uint8Array, and pdf-lib checks instanceof.
  return Uint8Array.from(file);
}

function glyphFits(font: PDFFont, char: string): boolean {
  try {
    font.widthOfTextAtSize(char, 12);
    return true;
  } catch {
    return false;
  }
}

/** Keeps characters the embedded Nunito subset can draw. Missing marks are dropped, not guessed. */
export function fitToFont(font: PDFFont, text: string, fallback: string): string {
  const replaced = text.replace(/[–—]/g, "-").replace(/[\u0000-\u001F\u007F]/g, " ");
  let out = "";
  for (const char of replaced) {
    if (char === " " || glyphFits(font, char)) out += char;
  }
  const cleaned = out.replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function sanitize(blocks: readonly Block[], font: PDFFont): Block[] {
  const next: Block[] = [];
  for (const block of blocks) {
    if (block.kind === "spacer") {
      next.push(block);
      continue;
    }
    if (block.kind === "text") {
      const value = fitToFont(font, block.text, "");
      if (value) next.push({ ...block, text: value });
      continue;
    }
    next.push({
      ...block,
      columns: block.columns.map((column) => ({
        ...column,
        header: fitToFont(font, column.header, "-"),
      })),
      rows: block.rows.map((row) => row.map((cell) => fitToFont(font, cell, ""))),
    });
  }
  return next;
}

/**
 * Builds a weekly report PDF with embedded Nunito so Turkish letters are real glyphs.
 * Standard PDF fonts cannot draw ğ, ş, ı or İ. The file is not written to disk here.
 */
export async function renderReportPdf(blocks: readonly Block[]): Promise<Uint8Array> {
  regularCache ??= fontFile("Nunito-Regular.ttf");
  boldCache ??= fontFile("Nunito-Bold.ttf");
  const pdf = await PDFDocument.create();
  const fontkit = loadFontkit();
  pdf.registerFontkit({ create: fontkit.create });
  const regular = await pdf.embedFont(regularCache, { subset: true });
  const bold = await pdf.embedFont(boldCache, { subset: true });
  const measure: Measure = (value, size, isBold) =>
    (isBold ? bold : regular).widthOfTextAtSize(value, size);
  const pages = layoutBlocks(sanitize(blocks, regular), measure);

  for (const [index, laid] of pages.entries()) {
    const page = pdf.addPage([PDF_PAGE.width, PDF_PAGE.height]);
    for (const glyph of laid.glyphs) {
      page.drawText(glyph.text, {
        x: glyph.x,
        y: PDF_PAGE.height - glyph.y - glyph.size,
        size: glyph.size,
        font: glyph.bold ? bold : regular,
        color: INK,
      });
    }
    const footer = fitToFont(
      regular,
      `Sayfa ${index + 1} / ${pages.length}. Bu dosya 24 saat sonra silinir.`,
      "Sayfa",
    );
    page.drawText(footer, {
      x: PDF_PAGE.margin,
      y: 24,
      size: 9,
      font: regular,
      color: INK,
    });
  }

  return pdf.save({ useObjectStreams: false });
}
