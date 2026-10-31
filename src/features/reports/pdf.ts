import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as fontkitNamespace from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import {
  layoutBlocks,
  PDF_CONTENT_WIDTH,
  PDF_PAGE,
  type Block,
  type DrawOp,
  type Glyph,
  type LaidPage,
  type Measure,
} from "./layout";

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

const COLORS = {
  ink: rgb(0.12, 0.16, 0.22),
  navy: rgb(0.06, 0.12, 0.24),
  teal: rgb(0.06, 0.46, 0.43),
  blue: rgb(0.11, 0.31, 0.86),
  orange: rgb(0.85, 0.47, 0.02),
  purple: rgb(0.49, 0.23, 0.72),
  green: rgb(0.09, 0.4, 0.2),
  muted: rgb(0.39, 0.45, 0.55),
  border: rgb(0.84, 0.87, 0.91),
  card: rgb(0.93, 0.95, 0.98),
  white: rgb(1, 1, 1),
  priority: rgb(1, 0.95, 0.9),
} as const;

type ColorName = keyof typeof COLORS;

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
    if (block.kind === "spacer" || block.kind === "page_break") {
      next.push(block);
      continue;
    }
    if (block.kind === "text") {
      const value = fitToFont(font, block.text, "");
      if (value) next.push({ ...block, text: value });
      continue;
    }
    if (block.kind === "metrics") {
      next.push({
        ...block,
        items: block.items.map((item) => ({
          label: fitToFont(font, item.label, "-"),
          value: fitToFont(font, item.value, "-"),
        })),
      });
      continue;
    }
    if (block.kind === "bar_chart") {
      next.push({
        ...block,
        title: fitToFont(font, block.title, "Grafik"),
        emptyMessage: fitToFont(font, block.emptyMessage, "Veri yok"),
        bars: block.bars.map((bar) => ({
          ...bar,
          label: fitToFont(font, bar.label, "-"),
        })),
      });
      continue;
    }
    if (block.kind === "line_chart") {
      next.push({
        ...block,
        title: fitToFont(font, block.title, "Grafik"),
        yLabel: fitToFont(font, block.yLabel, ""),
        emptyMessage: fitToFont(font, block.emptyMessage, "Veri yok"),
        series: block.series.map((line) => ({
          ...line,
          label: fitToFont(font, line.label, "-"),
          points: line.points.map((point) => ({
            ...point,
            label: fitToFont(font, point.label, "-"),
          })),
        })),
      });
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

function pdfY(topY: number, size = 0): number {
  return PDF_PAGE.height - topY - size;
}

function colorOf(name: ColorName | string): RGB {
  return COLORS[name as ColorName] ?? COLORS.ink;
}

function drawOps(page: PDFPage, draws: readonly DrawOp[]) {
  for (const op of draws) {
    if (op.kind === "rect") {
      page.drawRectangle({
        x: op.x,
        y: pdfY(op.y + op.height),
        width: op.width,
        height: op.height,
        color: op.fill ? colorOf(op.fill) : undefined,
        borderColor: op.stroke ? colorOf(op.stroke) : undefined,
        borderWidth: op.stroke ? 0.8 : undefined,
      });
      continue;
    }
    if (op.kind === "line") {
      page.drawLine({
        start: { x: op.x1, y: pdfY(op.y1) },
        end: { x: op.x2, y: pdfY(op.y2) },
        thickness: op.width,
        color: colorOf(op.color),
      });
      continue;
    }
    page.drawCircle({
      x: op.x,
      y: pdfY(op.y),
      size: op.radius,
      color: colorOf(op.fill),
      borderColor: op.stroke ? colorOf(op.stroke) : undefined,
      borderWidth: op.stroke ? 0.8 : undefined,
    });
  }
}

function drawGlyphs(
  page: PDFPage,
  glyphs: readonly Glyph[],
  regular: PDFFont,
  bold: PDFFont,
) {
  for (const glyph of glyphs) {
    page.drawText(glyph.text, {
      x: glyph.x,
      y: pdfY(glyph.y, glyph.size),
      size: glyph.size,
      font: glyph.bold ? bold : regular,
      color: colorOf(glyph.color),
    });
  }
}

function drawChrome(
  page: PDFPage,
  laid: LaidPage,
  index: number,
  total: number,
  regular: PDFFont,
  bold: PDFFont,
) {
  page.drawRectangle({
    x: 0,
    y: PDF_PAGE.height - PDF_PAGE.margin - PDF_PAGE.header + 8,
    width: PDF_PAGE.width,
    height: PDF_PAGE.margin + PDF_PAGE.header - 8,
    color: COLORS.white,
  });
  page.drawRectangle({
    x: PDF_PAGE.margin,
    y: PDF_PAGE.height - PDF_PAGE.margin - 18,
    width: 4,
    height: 18,
    color: COLORS.teal,
  });
  const title = fitToFont(bold, laid.headerTitle, "LGS Pusula");
  page.drawText(title, {
    x: PDF_PAGE.margin + 10,
    y: PDF_PAGE.height - PDF_PAGE.margin - 14,
    size: 11,
    font: bold,
    color: COLORS.navy,
  });
  if (laid.headerSubtitle) {
    const subtitle = fitToFont(regular, laid.headerSubtitle, "");
    if (subtitle) {
      page.drawText(subtitle, {
        x: PDF_PAGE.margin + 10,
        y: PDF_PAGE.height - PDF_PAGE.margin - 28,
        size: 8,
        font: regular,
        color: COLORS.muted,
      });
    }
  }
  page.drawLine({
    start: {
      x: PDF_PAGE.margin,
      y: PDF_PAGE.height - PDF_PAGE.margin - PDF_PAGE.header + 10,
    },
    end: {
      x: PDF_PAGE.margin + PDF_CONTENT_WIDTH,
      y: PDF_PAGE.height - PDF_PAGE.margin - PDF_PAGE.header + 10,
    },
    thickness: 1,
    color: COLORS.border,
  });

  page.drawLine({
    start: { x: PDF_PAGE.margin, y: PDF_PAGE.margin + PDF_PAGE.footer - 6 },
    end: {
      x: PDF_PAGE.margin + PDF_CONTENT_WIDTH,
      y: PDF_PAGE.margin + PDF_PAGE.footer - 6,
    },
    thickness: 0.8,
    color: COLORS.border,
  });
  const footer = fitToFont(
    regular,
    `LGS Pusula · Sayfa ${index + 1} / ${total} · Bu dosya 24 saat sonra silinir.`,
    "Sayfa",
  );
  page.drawText(footer, {
    x: PDF_PAGE.margin,
    y: 18,
    size: 8,
    font: regular,
    color: COLORS.muted,
  });
}

/**
 * Builds an academic report PDF with embedded Nunito so Turkish letters are real glyphs.
 * Standard PDF fonts cannot draw ğ, ş, ı or İ. The file is not written to disk here.
 */
export async function renderReportPdf(
  blocks: readonly Block[],
  meta?: { headerTitle?: string; headerSubtitle?: string },
): Promise<Uint8Array> {
  regularCache ??= fontFile("Nunito-Regular.ttf");
  boldCache ??= fontFile("Nunito-Bold.ttf");
  const pdf = await PDFDocument.create();
  const fontkit = loadFontkit();
  pdf.registerFontkit({ create: fontkit.create });
  const regular = await pdf.embedFont(regularCache, { subset: true });
  const bold = await pdf.embedFont(boldCache, { subset: true });
  const measure: Measure = (value, size, isBold) =>
    (isBold ? bold : regular).widthOfTextAtSize(value, size);
  const pages = layoutBlocks(sanitize(blocks, regular), measure, {
    headerTitle: meta?.headerTitle ?? "LGS Pusula",
    headerSubtitle: meta?.headerSubtitle ?? "",
  });

  for (const [index, laid] of pages.entries()) {
    const page = pdf.addPage([PDF_PAGE.width, PDF_PAGE.height]);
    drawOps(page, laid.draws);
    drawGlyphs(page, laid.glyphs, regular, bold);
    drawChrome(page, laid, index, pages.length, regular, bold);
  }

  return pdf.save({ useObjectStreams: false });
}
