import { StateMessage } from "@/components/ui/state-message";
import {
  TableScroll,
  tdClassName,
  thClassName,
  tableClassName,
} from "@/components/ui/table-scroll";
import { formatNet } from "@/features/exams/net-rules";
import {
  formatTurkishDate,
  formatTurkishDateRange,
  type DateWindow,
} from "@/features/study/calendar";
import type { NetTrendPoint } from "../load-analysis";
import { OUTCOME_MESSAGES } from "../messages";

/**
 * Accessible exam-to-exam net chart: SVG bars plus a data table with the same values.
 * No third-party chart library — one metric series does not justify a heavy dependency,
 * and UI rules already require a table alternative for every chart.
 */
export function NetTrendChart({
  points,
  window,
  showChart,
}: {
  points: readonly NetTrendPoint[];
  window: DateWindow;
  showChart: boolean;
}) {
  const rangeLabel = formatTurkishDateRange(window);

  if (!showChart) {
    return (
      <StateMessage
        variant="empty"
        title={OUTCOME_MESSAGES.emptyTrend}
        description={`Aralık: ${rangeLabel}. Birim: ${OUTCOME_MESSAGES.chartUnit}.`}
      />
    );
  }

  const maxNet = Math.max(...points.map((point) => point.totalNet), 1);
  const chartHeight = 160;
  const barWidth = 28;
  const gap = 16;
  const chartWidth = Math.max(points.length * (barWidth + gap), 240);

  return (
    <figure className="grid min-w-0 gap-4">
      <figcaption className="grid min-w-0 gap-1">
        <h2 className="font-bold text-ink-900">{OUTCOME_MESSAGES.chartTitle}</h2>
        <p className="text-sm text-ink-700">
          Aralık: {rangeLabel}. Birim: {OUTCOME_MESSAGES.chartUnit}.
        </p>
      </figcaption>

      <div
        role="img"
        aria-label={`${OUTCOME_MESSAGES.chartTitle}. ${points
          .map(
            (point) =>
              `${point.title}, ${formatTurkishDate(point.takenOn)}, ${formatNet(point.totalNet)} net`,
          )
          .join(". ")}`}
        className="max-w-full overflow-x-auto rounded-xl border border-border bg-surface p-3"
      >
        <svg
          width={chartWidth}
          height={chartHeight + 36}
          viewBox={`0 0 ${chartWidth} ${chartHeight + 36}`}
          className="max-w-none"
          aria-hidden="true"
        >
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            className="stroke-border"
            strokeWidth={1}
          />
          {points.map((point, index) => {
            const height = Math.max((point.totalNet / maxNet) * (chartHeight - 8), 2);
            const x = index * (barWidth + gap) + gap / 2;
            const y = chartHeight - height;
            return (
              <g key={point.examId}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  className="fill-brand-600"
                  rx={4}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  className="fill-ink-700 text-[10px]"
                >
                  {formatTurkishDate(point.takenOn).slice(0, 5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <TableScroll label={`${OUTCOME_MESSAGES.chartTitle} tablosu`}>
        <table className={tableClassName}>
          <caption className="sr-only">
            {OUTCOME_MESSAGES.chartTitle}. Aynı verinin tablo hali. Birim:{" "}
            {OUTCOME_MESSAGES.chartUnit}. Aralık: {rangeLabel}.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={thClassName}>
                Deneme
              </th>
              <th scope="col" className={thClassName}>
                Tarih
              </th>
              <th scope="col" className={thClassName}>
                Toplam net
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.examId}>
                <th scope="row" className={tdClassName}>
                  {point.title}
                </th>
                <td className={tdClassName}>{formatTurkishDate(point.takenOn)}</td>
                <td className={`${tdClassName} tabular-nums`}>
                  {formatNet(point.totalNet)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </figure>
  );
}
