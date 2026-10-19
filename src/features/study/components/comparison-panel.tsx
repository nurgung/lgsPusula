"use client";

import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import {
  TableScroll,
  tableClassName,
  tdClassName,
  thClassName,
} from "@/components/ui/table-scroll";
import { TextField } from "@/components/ui/form-field";
import {
  formatTurkishDateRange,
  STUDY_DATE_MIN,
  type DateWindow,
} from "@/features/study/calendar";
import {
  comparePeriods,
  parseComparisonQuery,
  type StudyLogView,
} from "@/features/study/summary";

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function ComparisonPanel({
  logs,
  today,
  query,
}: {
  logs: readonly StudyLogView[];
  today: string;
  query: {
    from1?: string | string[];
    to1?: string | string[];
    from2?: string | string[];
    to2?: string | string[];
  };
}) {
  const raw = {
    from1: one(query.from1),
    to1: one(query.to1),
    from2: one(query.from2),
    to2: one(query.to2),
  };
  const parsed = parseComparisonQuery(raw, today);

  return (
    <div className="grid min-w-0 gap-4">
      <form method="get" className="grid min-w-0 gap-4">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <DatePair
            title="İlk aralık"
            fromName="from1"
            toName="to1"
            fromValue={parsed.ok ? parsed.first.from : raw.from1}
            toValue={parsed.ok ? parsed.first.to : raw.to1}
            today={today}
          />
          <DatePair
            title="İkinci aralık"
            fromName="from2"
            toName="to2"
            fromValue={parsed.ok ? parsed.second.from : raw.from2}
            toValue={parsed.ok ? parsed.second.to : raw.to2}
            today={today}
          />
        </div>
        <div>
          <Button type="submit">Karşılaştır</Button>
        </div>
      </form>
      {parsed.ok ? (
        <ComparisonTable logs={logs} first={parsed.first} second={parsed.second} />
      ) : (
        <StateMessage variant="error" title={parsed.message} />
      )}
    </div>
  );
}

function DatePair({
  title,
  fromName,
  toName,
  fromValue,
  toValue,
  today,
}: {
  title: string;
  fromName: string;
  toName: string;
  fromValue: string;
  toValue: string;
  today: string;
}) {
  return (
    <fieldset className="grid min-w-0 gap-3">
      <legend className="font-bold text-ink-900">{title}</legend>
      <TextField
        name={fromName}
        type="date"
        label={`${title} başlangıcı`}
        min={STUDY_DATE_MIN}
        max={today}
        defaultValue={fromValue}
      />
      <TextField
        name={toName}
        type="date"
        label={`${title} bitişi`}
        min={STUDY_DATE_MIN}
        max={today}
        defaultValue={toValue}
      />
    </fieldset>
  );
}

function ComparisonTable({
  logs,
  first,
  second,
}: {
  logs: readonly StudyLogView[];
  first: DateWindow;
  second: DateWindow;
}) {
  const result = comparePeriods(logs, first, second);
  const firstLabel = formatTurkishDateRange(first);
  const secondLabel = formatTurkishDateRange(second);

  return (
    <div className="grid min-w-0 gap-3">
      <p className="text-sm text-ink-700">
        Birim: soru ve dakika. İlk aralık {firstLabel}. İkinci aralık {secondLabel}.
      </p>
      <TableScroll label="İki tarih aralığının karşılaştırması">
        <table className={tableClassName}>
          <caption className="sr-only">
            {firstLabel} ile {secondLabel} karşılaştırması. Sütunlar soru sayısı ve
            dakikayı birlikte gösterir.
          </caption>
          <thead>
            <tr>
              <th className={thClassName} scope="col">
                Ders
              </th>
              <th className={thClassName} scope="col">
                İlk aralık
                <span className="mt-1 block font-normal">{firstLabel}</span>
                <span className="block font-normal">soru ve dakika</span>
              </th>
              <th className={thClassName} scope="col">
                İkinci aralık
                <span className="mt-1 block font-normal">{secondLabel}</span>
                <span className="block font-normal">soru ve dakika</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className={thClassName} scope="row">
                Toplam
              </th>
              <td className={tdClassName}>
                {result.first.questionCount} soru · {result.first.durationMinutes} dakika
              </td>
              <td className={tdClassName}>
                {result.second.questionCount} soru · {result.second.durationMinutes}{" "}
                dakika
              </td>
            </tr>
            {result.subjects.map((subject) => (
              <tr key={subject.subjectId}>
                <th className={thClassName} scope="row">
                  {subject.subjectName}
                </th>
                <td className={tdClassName}>
                  {subject.firstQuestions} soru · {subject.firstMinutes} dakika
                </td>
                <td className={tdClassName}>
                  {subject.secondQuestions} soru · {subject.secondMinutes} dakika
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      {result.subjects.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Bu aralıklarda kayıt yok."
          description="Kayıt ekleyince soru sayısı ve süre burada görünür."
        />
      ) : null}
    </div>
  );
}
