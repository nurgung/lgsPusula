import { StateMessage } from "@/components/ui/state-message";
import {
  TableScroll,
  tdClassName,
  thClassName,
  tableClassName,
} from "@/components/ui/table-scroll";
import {
  formatTurkishDate,
  formatTurkishDateRange,
  type DateWindow,
} from "@/features/study/calendar";
import { OUTCOME_MESSAGES } from "../messages";
import type { OutcomePriority } from "../prioritize";

export function OutcomePriorityList({
  items,
  window,
}: {
  items: readonly OutcomePriority[];
  window: DateWindow;
}) {
  const rangeLabel = formatTurkishDateRange(window);

  if (items.length === 0) {
    return (
      <StateMessage
        variant="empty"
        title={OUTCOME_MESSAGES.emptyNoMappings}
        description={`Aralık: ${rangeLabel}. Kazanım tespiti yalnızca senin bağladığın satırlardan yapılır.`}
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-3">
      <p className="text-sm text-ink-700">
        Aralık: {rangeLabel}. Birim: öncelik puanı (yanlış 2, boş 1). Kural:{" "}
        {items[0]?.ruleVersion}.
      </p>
      <TableScroll label="Öncelikli kazanımlar tablosu">
        <table className={tableClassName}>
          <caption className="sr-only">
            Yanlış ve boş sorulara bağlanan kazanımların öncelik listesi. Aralık:{" "}
            {rangeLabel}.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={thClassName}>
                Sıra
              </th>
              <th scope="col" className={thClassName}>
                Kazanım
              </th>
              <th scope="col" className={thClassName}>
                Ders
              </th>
              <th scope="col" className={thClassName}>
                Puan
              </th>
              <th scope="col" className={thClassName}>
                Yanlış / boş
              </th>
              <th scope="col" className={thClassName}>
                Son deneme
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.outcomeId}>
                <td className={`${tdClassName} tabular-nums`}>{index + 1}</td>
                <th scope="row" className={tdClassName}>
                  <span className="font-semibold text-ink-900">{item.outcomeCode}</span>
                  <span className="mt-1 block font-normal text-ink-700">
                    {item.outcomeDescription}
                  </span>
                </th>
                <td className={tdClassName}>{item.subjectName}</td>
                <td className={`${tdClassName} tabular-nums`}>{item.score}</td>
                <td className={`${tdClassName} tabular-nums`}>
                  {item.wrongCount} / {item.blankCount}
                </td>
                <td className={tdClassName}>{formatTurkishDate(item.lastTakenOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </div>
  );
}
