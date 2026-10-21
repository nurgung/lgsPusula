import { StateMessage } from "@/components/ui/state-message";
import {
  TableScroll,
  tableClassName,
  tdClassName,
  thClassName,
} from "@/components/ui/table-scroll";
import { formatTurkishDateRange, type DateWindow } from "@/features/study/calendar";
import type { PeriodSummary } from "@/features/study/summary";
import { REPORT_MESSAGES } from "../messages";

function Totals({ summary }: { summary: PeriodSummary }) {
  const items = [
    ["Soru sayısı", `${summary.questionCount} soru`],
    ["Doğru", `${summary.correctCount} doğru`],
    ["Yanlış", `${summary.wrongCount} yanlış`],
    ["Boş", `${summary.blankCount} boş`],
    ["Süre", `${summary.durationMinutes} dakika`],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-sm text-ink-600">{label}</dt>
          <dd className="font-bold break-words text-ink-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SubjectTable({ summary }: { summary: PeriodSummary }) {
  if (summary.bySubject.length === 0) {
    return (
      <StateMessage
        variant="empty"
        title="Bu aralıkta çalışma kaydı yok."
        description={REPORT_MESSAGES.noSubjects}
      />
    );
  }
  return (
    <TableScroll label="Derslere göre soru ve dakika">
      <table className={tableClassName}>
        <caption className="sr-only">
          {formatTurkishDateRange(summary)} derslere göre soru ve dakika
        </caption>
        <thead>
          <tr>
            <th className={thClassName} scope="col">
              Ders
            </th>
            <th className={thClassName} scope="col">
              Soru
            </th>
            <th className={thClassName} scope="col">
              Dakika
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.bySubject.map((row) => (
            <tr key={row.subjectId}>
              <th className={`${tdClassName} text-left font-semibold`} scope="row">
                {row.subjectName}
              </th>
              <td className={tdClassName}>{row.questionCount} soru</td>
              <td className={tdClassName}>{row.durationMinutes} dakika</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export function PeriodSummaryPanel({
  currentLabel,
  current,
  previousLabel,
  previous,
  note,
}: {
  currentLabel: string;
  current: PeriodSummary;
  previousLabel: string;
  previous: PeriodSummary;
  note: string;
}) {
  const rows: { label: string; window: DateWindow; summary: PeriodSummary }[] = [
    { label: currentLabel, window: current, summary: current },
    { label: previousLabel, window: previous, summary: previous },
  ];
  return (
    <div className="grid min-w-0 gap-4">
      <Totals summary={current} />
      <SubjectTable summary={current} />
      <TableScroll label="İki dönemin soru ve dakika karşılaştırması">
        <table className={tableClassName}>
          <caption className="sr-only">
            İki dönemin soru ve dakika karşılaştırması
          </caption>
          <thead>
            <tr>
              <th className={thClassName} scope="col">
                Aralık
              </th>
              <th className={thClassName} scope="col">
                Soru
              </th>
              <th className={thClassName} scope="col">
                Dakika
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className={`${tdClassName} text-left font-semibold`} scope="row">
                  {row.label}: {formatTurkishDateRange(row.window)}
                </th>
                <td className={tdClassName}>{row.summary.questionCount} soru</td>
                <td className={tdClassName}>{row.summary.durationMinutes} dakika</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <p className="text-sm text-ink-700">{note}</p>
    </div>
  );
}
