/**
 * A4 layout in PDF points. y grows downward from the top of the page.
 * The footer band is reserved so a table row is not drawn under the page number.
 */

export type Measure = (text: string, size: number, bold: boolean) => number;

export type TextBlock = {
  kind: "text";
  text: string;
  size: number;
  bold: boolean;
};

export type SpacerBlock = { kind: "spacer"; height: number };

export type TableBlock = {
  kind: "table";
  columns: { header: string; width: number }[];
  rows: string[][];
  size: number;
};

export type Block = TextBlock | SpacerBlock | TableBlock;

export type Glyph = {
  text: string;
  x: number;
  y: number;
  size: number;
  bold: boolean;
};

export type LaidPage = { glyphs: Glyph[] };

export const PDF_PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 48,
  footer: 28,
} as const;

export const PDF_CONTENT_WIDTH = PDF_PAGE.width - PDF_PAGE.margin * 2;
const CONTENT_TOP = PDF_PAGE.margin;
const CONTENT_BOTTOM = PDF_PAGE.height - PDF_PAGE.margin - PDF_PAGE.footer;

export function lineHeight(size: number): number {
  return Math.ceil(size * 1.4);
}

/** Split weights across the content width. The last column absorbs rounding. */
export function tableWidths(weights: readonly number[]): number[] {
  const total = PDF_CONTENT_WIDTH;
  const sum = weights.reduce((totalWeight, weight) => totalWeight + weight, 0);
  if (sum <= 0) throw new Error("Table weights must be positive.");
  const widths = weights.map((weight) => Math.floor((total * weight) / sum));
  const used = widths.reduce((totalWidth, width) => totalWidth + width, 0);
  const last = widths.length - 1;
  widths[last] = (widths[last] ?? 0) + (total - used);
  return widths;
}

function breakWord(
  word: string,
  maxWidth: number,
  size: number,
  bold: boolean,
  measure: Measure,
): string[] {
  if (measure(word, size, bold) <= maxWidth) return [word];
  const parts: string[] = [];
  let chunk = "";
  for (const char of word) {
    const next = chunk + char;
    if (chunk && measure(next, size, bold) > maxWidth) {
      parts.push(chunk);
      chunk = char;
    } else {
      chunk = next;
    }
  }
  if (chunk) parts.push(chunk);
  return parts.length > 0 ? parts : [word];
}

/** Wrap on spaces, then break a single long token so it cannot run past the column. */
export function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  bold: boolean,
  measure: Measure,
): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of clean.split(" ")) {
    for (const piece of breakWord(word, maxWidth, size, bold, measure)) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (measure(candidate, size, bold) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = piece;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

type Cursor = { pages: LaidPage[]; glyphs: Glyph[]; y: number };

function breakPage(cursor: Cursor) {
  cursor.pages.push({ glyphs: cursor.glyphs });
  cursor.glyphs = [];
  cursor.y = CONTENT_TOP;
}

function paintRow(
  cursor: Cursor,
  cells: readonly string[],
  widths: readonly number[],
  xPositions: readonly number[],
  size: number,
  bold: boolean,
  measure: Measure,
  repeatHeader?: () => void,
) {
  const groups = widths.map((width, index) => {
    const lines = wrapText(
      cells[index] ?? "",
      Math.max(8, width - 8),
      size,
      bold,
      measure,
    );
    return lines.length > 0 ? lines : [""];
  });
  const count = Math.max(...groups.map((lines) => lines.length));
  for (let line = 0; line < count; line += 1) {
    const height = lineHeight(size);
    if (cursor.y + height > CONTENT_BOTTOM && cursor.glyphs.length > 0) {
      breakPage(cursor);
      repeatHeader?.();
    }
    groups.forEach((lines, index) => {
      const text = lines[line] ?? "";
      if (!text) return;
      cursor.glyphs.push({
        text,
        x: (xPositions[index] ?? PDF_PAGE.margin) + 4,
        y: cursor.y,
        size,
        bold,
      });
    });
    cursor.y += height;
  }
}

function layoutTable(cursor: Cursor, block: TableBlock, measure: Measure) {
  const widths = block.columns.map((column) => column.width);
  const xPositions: number[] = [];
  let x = PDF_PAGE.margin;
  for (const width of widths) {
    xPositions.push(x);
    x += width;
  }
  const drawHeader = () => {
    paintRow(
      cursor,
      block.columns.map((column) => column.header),
      widths,
      xPositions,
      block.size,
      true,
      measure,
    );
  };
  drawHeader();
  for (const row of block.rows) {
    paintRow(cursor, row, widths, xPositions, block.size, false, measure, drawHeader);
  }
}

function layoutText(cursor: Cursor, block: TextBlock, measure: Measure) {
  const lines = wrapText(block.text, PDF_CONTENT_WIDTH, block.size, block.bold, measure);
  for (const line of lines) {
    const height = lineHeight(block.size);
    if (cursor.y + height > CONTENT_BOTTOM && cursor.glyphs.length > 0) breakPage(cursor);
    cursor.glyphs.push({
      text: line,
      x: PDF_PAGE.margin,
      y: cursor.y,
      size: block.size,
      bold: block.bold,
    });
    cursor.y += height;
  }
}

export function layoutBlocks(blocks: readonly Block[], measure: Measure): LaidPage[] {
  const cursor: Cursor = { pages: [], glyphs: [], y: CONTENT_TOP };
  for (const block of blocks) {
    if (block.kind === "spacer") {
      if (cursor.y + block.height > CONTENT_BOTTOM) {
        if (cursor.glyphs.length > 0) breakPage(cursor);
      } else {
        cursor.y += block.height;
      }
      continue;
    }
    if (block.kind === "text") {
      layoutText(cursor, block, measure);
      continue;
    }
    layoutTable(cursor, block, measure);
  }
  if (cursor.glyphs.length > 0) cursor.pages.push({ glyphs: cursor.glyphs });
  if (cursor.pages.length === 0) cursor.pages.push({ glyphs: [] });
  return cursor.pages;
}

export function blockPlainText(blocks: readonly Block[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "text") return block.text;
      if (block.kind === "spacer") return "";
      const header = block.columns.map((column) => column.header).join(" ");
      const rows = block.rows.map((row) => row.join(" ")).join("\n");
      return `${header}\n${rows}`;
    })
    .filter((text) => text !== "")
    .join("\n");
}
