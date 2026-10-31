/**
 * A4 layout in PDF points. y grows downward from the top of the page.
 * Header and footer bands are reserved so content is not drawn under them.
 */

export type Measure = (text: string, size: number, bold: boolean) => number;

export type TextBlock = {
  kind: "text";
  text: string;
  size: number;
  bold: boolean;
  color?: "ink" | "navy" | "teal" | "muted";
};

export type SpacerBlock = { kind: "spacer"; height: number };

export type PageBreakBlock = { kind: "page_break" };

export type TableBlock = {
  kind: "table";
  columns: { header: string; width: number }[];
  rows: string[][];
  size: number;
};

export type MetricCardItem = {
  label: string;
  value: string;
};

export type MetricsBlock = {
  kind: "metrics";
  items: MetricCardItem[];
};

export type BarChartBlock = {
  kind: "bar_chart";
  title: string;
  unit: string;
  bars: { label: string; value: number }[];
  emptyMessage: string;
  height?: number;
};

export type LineChartBlock = {
  kind: "line_chart";
  title: string;
  yLabel: string;
  series: {
    id: string;
    label: string;
    color: "navy" | "teal" | "blue" | "orange" | "purple" | "green";
    points: { label: string; value: number }[];
  }[];
  emptyMessage: string;
  showPointLabels?: boolean;
  height?: number;
};

export type Block =
  | TextBlock
  | SpacerBlock
  | PageBreakBlock
  | TableBlock
  | MetricsBlock
  | BarChartBlock
  | LineChartBlock;

export type Glyph = {
  text: string;
  x: number;
  y: number;
  size: number;
  bold: boolean;
  color: "ink" | "navy" | "teal" | "muted" | "white";
};

export type DrawOp =
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: "navy" | "teal" | "muted" | "card" | "white" | "priority";
      stroke?: "border" | "navy" | "teal";
      radius?: number;
    }
  | {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: "navy" | "teal" | "blue" | "orange" | "purple" | "green" | "border" | "muted";
      width: number;
    }
  | {
      kind: "circle";
      x: number;
      y: number;
      radius: number;
      fill: "navy" | "teal" | "blue" | "orange" | "purple" | "green" | "white";
      stroke?: "navy" | "teal" | "blue" | "orange" | "purple" | "green";
    };

export type LaidPage = {
  glyphs: Glyph[];
  draws: DrawOp[];
  headerTitle: string;
  headerSubtitle: string;
};

export const PDF_PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 42,
  header: 46,
  footer: 32,
} as const;

export const PDF_CONTENT_WIDTH = PDF_PAGE.width - PDF_PAGE.margin * 2;
const CONTENT_TOP = PDF_PAGE.margin + PDF_PAGE.header;
const CONTENT_BOTTOM = PDF_PAGE.height - PDF_PAGE.margin - PDF_PAGE.footer;

export function lineHeight(size: number): number {
  return Math.ceil(size * 1.35);
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

type Cursor = {
  pages: LaidPage[];
  glyphs: Glyph[];
  draws: DrawOp[];
  y: number;
  headerTitle: string;
  headerSubtitle: string;
};

function breakPage(cursor: Cursor) {
  cursor.pages.push({
    glyphs: cursor.glyphs,
    draws: cursor.draws,
    headerTitle: cursor.headerTitle,
    headerSubtitle: cursor.headerSubtitle,
  });
  cursor.glyphs = [];
  cursor.draws = [];
  cursor.y = CONTENT_TOP;
}

function ensureSpace(cursor: Cursor, height: number, repeatHeader?: () => void) {
  if (cursor.y + height > CONTENT_BOTTOM && cursor.glyphs.length + cursor.draws.length > 0) {
    breakPage(cursor);
    repeatHeader?.();
  }
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
  fillHeader = false,
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
  const rowHeight = count * lineHeight(size) + (fillHeader ? 4 : 0);
  ensureSpace(cursor, rowHeight, repeatHeader);
  if (fillHeader) {
    cursor.draws.push({
      kind: "rect",
      x: PDF_PAGE.margin,
      y: cursor.y - 2,
      width: PDF_CONTENT_WIDTH,
      height: rowHeight,
      fill: "navy",
    });
  }
  for (let line = 0; line < count; line += 1) {
    const height = lineHeight(size);
    groups.forEach((lines, index) => {
      const text = lines[line] ?? "";
      if (!text) return;
      cursor.glyphs.push({
        text,
        x: (xPositions[index] ?? PDF_PAGE.margin) + 4,
        y: cursor.y + (fillHeader ? 2 : 0),
        size,
        bold,
        color: fillHeader ? "white" : "ink",
      });
    });
    cursor.y += height;
  }
  if (fillHeader) cursor.y += 4;
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
      undefined,
      true,
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
    ensureSpace(cursor, height);
    cursor.glyphs.push({
      text: line,
      x: PDF_PAGE.margin,
      y: cursor.y,
      size: block.size,
      bold: block.bold,
      color: block.color ?? "ink",
    });
    cursor.y += height;
  }
}

function layoutMetrics(cursor: Cursor, block: MetricsBlock, measure: Measure) {
  const columns = Math.min(4, Math.max(2, block.items.length));
  const gap = 8;
  const cardWidth = (PDF_CONTENT_WIDTH - gap * (columns - 1)) / columns;
  const cardHeight = 52;
  const rows = Math.ceil(block.items.length / columns);
  const totalHeight = rows * cardHeight + (rows - 1) * gap;
  ensureSpace(cursor, totalHeight);
  block.items.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = PDF_PAGE.margin + col * (cardWidth + gap);
    const y = cursor.y + row * (cardHeight + gap);
    cursor.draws.push({
      kind: "rect",
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      fill: "card",
      stroke: "border",
      radius: 6,
    });
    cursor.draws.push({
      kind: "rect",
      x,
      y,
      width: 4,
      height: cardHeight,
      fill: "teal",
    });
    cursor.glyphs.push({
      text: item.label,
      x: x + 12,
      y: y + 8,
      size: 8,
      bold: false,
      color: "muted",
    });
    const valueLines = wrapText(item.value, cardWidth - 20, 13, true, measure);
    cursor.glyphs.push({
      text: valueLines[0] ?? item.value,
      x: x + 12,
      y: y + 24,
      size: 13,
      bold: true,
      color: "navy",
    });
  });
  cursor.y += totalHeight;
}

function layoutBarChart(cursor: Cursor, block: BarChartBlock, measure: Measure) {
  const chartHeight = block.height ?? Math.max(80, block.bars.length * 22 + 36);
  ensureSpace(cursor, chartHeight + 20);
  cursor.glyphs.push({
    text: block.title,
    x: PDF_PAGE.margin,
    y: cursor.y,
    size: 11,
    bold: true,
    color: "navy",
  });
  cursor.y += lineHeight(11) + 4;
  if (block.bars.length === 0) {
    cursor.glyphs.push({
      text: block.emptyMessage,
      x: PDF_PAGE.margin,
      y: cursor.y,
      size: 10,
      bold: false,
      color: "muted",
    });
    cursor.y += lineHeight(10) + 8;
    return;
  }
  const labelWidth = 110;
  const maxValue = Math.max(...block.bars.map((bar) => bar.value), 1);
  const barArea = PDF_CONTENT_WIDTH - labelWidth - 48;
  for (const bar of block.bars) {
    const y = cursor.y;
    const label = wrapText(bar.label, labelWidth - 4, 9, false, measure)[0] ?? bar.label;
    cursor.glyphs.push({
      text: label,
      x: PDF_PAGE.margin,
      y: y + 2,
      size: 9,
      bold: false,
      color: "ink",
    });
    const width = Math.max(4, (bar.value / maxValue) * barArea);
    cursor.draws.push({
      kind: "rect",
      x: PDF_PAGE.margin + labelWidth,
      y,
      width,
      height: 14,
      fill: "teal",
      radius: 3,
    });
    cursor.glyphs.push({
      text: `${bar.value} ${block.unit}`,
      x: PDF_PAGE.margin + labelWidth + width + 6,
      y: y + 2,
      size: 9,
      bold: true,
      color: "navy",
    });
    cursor.y += 22;
  }
  cursor.y += 8;
}

function finitePoints(
  series: LineChartBlock["series"],
): { seriesIndex: number; pointIndex: number; label: string; value: number }[] {
  const out: { seriesIndex: number; pointIndex: number; label: string; value: number }[] =
    [];
  series.forEach((line, seriesIndex) => {
    line.points.forEach((point, pointIndex) => {
      if (Number.isFinite(point.value)) {
        out.push({
          seriesIndex,
          pointIndex,
          label: point.label,
          value: point.value,
        });
      }
    });
  });
  return out;
}

function layoutLineChart(cursor: Cursor, block: LineChartBlock, measure: Measure) {
  const chartHeight = block.height ?? 160;
  const plotHeight = chartHeight - 48;
  ensureSpace(cursor, chartHeight + 28);
  cursor.glyphs.push({
    text: block.title,
    x: PDF_PAGE.margin,
    y: cursor.y,
    size: 11,
    bold: true,
    color: "navy",
  });
  cursor.y += lineHeight(11) + 2;
  const points = finitePoints(block.series);
  if (points.length === 0) {
    cursor.glyphs.push({
      text: block.emptyMessage,
      x: PDF_PAGE.margin,
      y: cursor.y,
      size: 10,
      bold: false,
      color: "muted",
    });
    cursor.y += lineHeight(10) + 8;
    return;
  }
  const labels = [
    ...new Set(block.series.flatMap((line) => line.points.map((point) => point.label))),
  ];
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const pad = maxValue === minValue ? Math.max(1, Math.abs(maxValue) * 0.1 || 1) : 0;
  const low = minValue - pad;
  const high = maxValue + pad;
  const plotLeft = PDF_PAGE.margin + 36;
  const plotRight = PDF_PAGE.margin + PDF_CONTENT_WIDTH - 8;
  const plotTop = cursor.y + 8;
  const plotBottom = plotTop + plotHeight;
  cursor.draws.push({
    kind: "rect",
    x: plotLeft,
    y: plotTop,
    width: plotRight - plotLeft,
    height: plotHeight,
    fill: "white",
    stroke: "border",
  });
  cursor.glyphs.push({
    text: block.yLabel,
    x: PDF_PAGE.margin,
    y: plotTop,
    size: 8,
    bold: false,
    color: "muted",
  });
  const yFor = (value: number) =>
    plotBottom - ((value - low) / (high - low || 1)) * plotHeight;
  const xFor = (index: number) =>
    labels.length <= 1
      ? (plotLeft + plotRight) / 2
      : plotLeft + (index / (labels.length - 1)) * (plotRight - plotLeft);

  for (const [seriesIndex, line] of block.series.entries()) {
    const coords: { x: number; y: number; value: number }[] = [];
    line.points.forEach((point) => {
      if (!Number.isFinite(point.value)) return;
      const index = labels.indexOf(point.label);
      if (index < 0) return;
      coords.push({ x: xFor(index), y: yFor(point.value), value: point.value });
    });
    for (let i = 1; i < coords.length; i += 1) {
      const prev = coords[i - 1]!;
      const next = coords[i]!;
      cursor.draws.push({
        kind: "line",
        x1: prev.x,
        y1: prev.y,
        x2: next.x,
        y2: next.y,
        color: line.color,
        width: 1.6,
      });
    }
    for (const point of coords) {
      cursor.draws.push({
        kind: "circle",
        x: point.x,
        y: point.y,
        radius: 2.8,
        fill: line.color,
        stroke: line.color,
      });
      if (block.showPointLabels) {
        const label = point.value.toLocaleString("tr-TR", {
          maximumFractionDigits: 2,
        });
        const width = measure(label, 7, true);
        cursor.glyphs.push({
          text: label,
          x: point.x - width / 2,
          y: point.y - 12,
          size: 7,
          bold: true,
          color: "navy",
        });
      }
    }
    void seriesIndex;
  }

  labels.forEach((label, index) => {
    const short = wrapText(label, 54, 7, false, measure)[0] ?? label;
    const width = measure(short, 7, false);
    cursor.glyphs.push({
      text: short,
      x: xFor(index) - width / 2,
      y: plotBottom + 4,
      size: 7,
      bold: false,
      color: "muted",
    });
  });

  let legendX = PDF_PAGE.margin;
  const legendY = plotBottom + 20;
  for (const line of block.series) {
    cursor.draws.push({
      kind: "rect",
      x: legendX,
      y: legendY,
      width: 10,
      height: 10,
      fill: line.color === "navy" ? "navy" : line.color === "teal" ? "teal" : "card",
      stroke: "border",
    });
    if (line.color !== "navy" && line.color !== "teal") {
      cursor.draws.push({
        kind: "line",
        x1: legendX,
        y1: legendY + 5,
        x2: legendX + 10,
        y2: legendY + 5,
        color: line.color,
        width: 2,
      });
    }
    cursor.glyphs.push({
      text: line.label,
      x: legendX + 14,
      y: legendY,
      size: 8,
      bold: false,
      color: "ink",
    });
    legendX += measure(line.label, 8, false) + 28;
  }
  cursor.y = legendY + 18;
}

export type LayoutMeta = {
  headerTitle: string;
  headerSubtitle: string;
};

export function layoutBlocks(
  blocks: readonly Block[],
  measure: Measure,
  meta: LayoutMeta = { headerTitle: "LGS Pusula", headerSubtitle: "" },
): LaidPage[] {
  const cursor: Cursor = {
    pages: [],
    glyphs: [],
    draws: [],
    y: CONTENT_TOP,
    headerTitle: meta.headerTitle,
    headerSubtitle: meta.headerSubtitle,
  };
  for (const block of blocks) {
    if (block.kind === "page_break") {
      if (cursor.glyphs.length + cursor.draws.length > 0) breakPage(cursor);
      continue;
    }
    if (block.kind === "spacer") {
      if (cursor.y + block.height > CONTENT_BOTTOM) {
        if (cursor.glyphs.length + cursor.draws.length > 0) breakPage(cursor);
      } else {
        cursor.y += block.height;
      }
      continue;
    }
    if (block.kind === "text") {
      layoutText(cursor, block, measure);
      continue;
    }
    if (block.kind === "metrics") {
      layoutMetrics(cursor, block, measure);
      continue;
    }
    if (block.kind === "bar_chart") {
      layoutBarChart(cursor, block, measure);
      continue;
    }
    if (block.kind === "line_chart") {
      layoutLineChart(cursor, block, measure);
      continue;
    }
    layoutTable(cursor, block, measure);
  }
  if (cursor.glyphs.length + cursor.draws.length > 0) {
    cursor.pages.push({
      glyphs: cursor.glyphs,
      draws: cursor.draws,
      headerTitle: cursor.headerTitle,
      headerSubtitle: cursor.headerSubtitle,
    });
  }
  if (cursor.pages.length === 0) {
    cursor.pages.push({
      glyphs: [],
      draws: [],
      headerTitle: meta.headerTitle,
      headerSubtitle: meta.headerSubtitle,
    });
  }
  return cursor.pages;
}

export function blockPlainText(blocks: readonly Block[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "text") return block.text;
      if (block.kind === "spacer" || block.kind === "page_break") return "";
      if (block.kind === "metrics") {
        return block.items.map((item) => `${item.label} ${item.value}`).join("\n");
      }
      if (block.kind === "bar_chart") {
        if (block.bars.length === 0) return `${block.title}\n${block.emptyMessage}`;
        return `${block.title}\n${block.bars
          .map((bar) => `${bar.label} ${bar.value}`)
          .join("\n")}`;
      }
      if (block.kind === "line_chart") {
        if (block.series.every((line) => line.points.length === 0)) {
          return `${block.title}\n${block.emptyMessage}`;
        }
        return `${block.title}\n${block.series
          .map(
            (line) =>
              `${line.label}: ${line.points
                .filter((point) => Number.isFinite(point.value))
                .map((point) => `${point.label}=${point.value}`)
                .join(", ")}`,
          )
          .join("\n")}`;
      }
      const header = block.columns.map((column) => column.header).join(" ");
      const rows = block.rows.map((row) => row.join(" ")).join("\n");
      return `${header}\n${rows}`;
    })
    .filter((text) => text !== "")
    .join("\n");
}
