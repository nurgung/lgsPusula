import { useId } from "react";
import type { AnalysisPoint } from "@/features/exams/analysis";

/**
 * Small accessible line chart for one measure (score or net). Pure SVG, no chart library.
 * Points are real saved exams only, one per exam, in date order and evenly spaced. The
 * value axis shows its smallest and largest label so a short line is not read as a big jump.
 * A table with the same values sits next to the charts in `ExamAnalysisCard`.
 */

const WIDTH = 260;
const HEIGHT = 190;
const MARGIN = { top: 22, right: 14, bottom: 30, left: 42 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
/** Value labels above every point only while there is room for them. */
const LABEL_ALL_UP_TO = 5;

export function formatShortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function axisRange(values: readonly number[], hardMax?: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, 1);
  const lower = Math.max(0, Math.floor(min - pad));
  let upper = Math.ceil(max + pad);
  if (hardMax !== undefined) upper = Math.min(upper, hardMax);
  if (upper <= lower) upper = lower + 1;
  return { lower, upper };
}

const axisNumber = (value: number) =>
  value.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

export function ExamLineChart({
  title,
  unit,
  points,
  formatValue,
  hardMax,
  emptyText,
}: {
  title: string;
  /** Short unit text shown under the title, e.g. "puan (0–500)". */
  unit: string;
  points: readonly AnalysisPoint[];
  formatValue: (value: number) => string;
  hardMax?: number;
  /** Shown when no saved value exists for this measure. */
  emptyText: string;
}) {
  const headingId = useId();

  return (
    <figure className="grid min-w-0 gap-2" aria-labelledby={headingId}>
      <figcaption className="min-w-0">
        <p id={headingId} className="font-bold break-words text-ink-900">
          {title}
        </p>
        <p className="text-helper text-ink-600">Birim: {unit}</p>
      </figcaption>
      {points.length === 0 ? (
        <p className="rounded-card border border-border bg-surface-muted p-3 text-sm text-ink-700">
          {emptyText}
        </p>
      ) : (
        <ChartBody
          title={title}
          points={points}
          formatValue={formatValue}
          hardMax={hardMax}
        />
      )}
    </figure>
  );
}

function ChartBody({
  title,
  points,
  formatValue,
  hardMax,
}: {
  title: string;
  points: readonly AnalysisPoint[];
  formatValue: (value: number) => string;
  hardMax?: number;
}) {
  const { lower, upper } = axisRange(
    points.map((point) => point.value),
    hardMax,
  );
  const xAt = (index: number) =>
    points.length === 1
      ? MARGIN.left + PLOT_W / 2
      : MARGIN.left + (PLOT_W * index) / (points.length - 1);
  const yAt = (value: number) =>
    MARGIN.top + PLOT_H - ((value - lower) / (upper - lower)) * PLOT_H;
  const ticks = [lower, (lower + upper) / 2, upper];
  const coords = points.map((point, index) => ({
    point,
    x: xAt(index),
    y: yAt(point.value),
    last: index === points.length - 1,
  }));
  const label = `${title}. ${points
    .map((point) => `${formatShortDate(point.takenOn)}: ${formatValue(point.value)}`)
    .join("; ")}.`;
  const labelled = coords.filter((item) => item.last || points.length <= LABEL_ALL_UP_TO);
  const firstDate = points[0]!.takenOn;
  const lastDate = points[points.length - 1]!.takenOn;

  return (
    <>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={label}
        className="block h-auto w-full"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 6}
              y={yAt(tick) + 4}
              textAnchor="end"
              className="fill-ink-700 text-xs"
            >
              {axisNumber(tick)}
            </text>
          </g>
        ))}
        {points.length > 1 ? (
          <polyline
            points={coords.map((item) => `${item.x},${item.y}`).join(" ")}
            fill="none"
            className="stroke-brand-600"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {coords.map((item) => (
          <circle
            key={item.point.examId}
            cx={item.x}
            cy={item.y}
            r={item.last ? 5 : 4}
            strokeWidth={2.5}
            className={
              item.last
                ? "fill-brand-600 stroke-brand-600"
                : "fill-surface stroke-brand-600"
            }
          />
        ))}
        {labelled.map((item) => (
          <text
            key={item.point.examId}
            x={Math.min(Math.max(item.x, MARGIN.left + 18), WIDTH - MARGIN.right - 18)}
            y={item.y - 10}
            textAnchor="middle"
            strokeWidth={4}
            strokeLinejoin="round"
            className={
              item.last
                ? "fill-ink-900 stroke-surface text-xs font-bold [paint-order:stroke]"
                : "fill-ink-700 stroke-surface text-xs [paint-order:stroke]"
            }
          >
            {formatValue(item.point.value)}
          </text>
        ))}
        {points.length === 1 ? (
          <text
            x={xAt(0)}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-ink-700 text-xs"
          >
            {formatShortDate(firstDate)}
          </text>
        ) : (
          <>
            <text
              x={MARGIN.left}
              y={HEIGHT - 8}
              textAnchor="start"
              className="fill-ink-700 text-xs"
            >
              {formatShortDate(firstDate)}
            </text>
            <text
              x={WIDTH - MARGIN.right}
              y={HEIGHT - 8}
              textAnchor="end"
              className="fill-ink-700 text-xs"
            >
              {formatShortDate(lastDate)}
            </text>
          </>
        )}
      </svg>
      {points.length === 1 ? (
        <p className="text-helper text-ink-600">
          Tek kayıt var. Bir kayıt daha olunca değişim görünür.
        </p>
      ) : null}
    </>
  );
}
