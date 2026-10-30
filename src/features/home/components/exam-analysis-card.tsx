import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import {
  TableScroll,
  tableClassName,
  tdClassName,
  thClassName,
} from "@/components/ui/table-scroll";
import {
  formatSignedChange,
  type AnalysisChange,
  type ExamAnalysis,
} from "@/features/exams/analysis";
import { EXAM_TYPE_LABELS } from "@/features/exams/labels";
import { formatExamScore, formatNet } from "@/features/exams/net-rules";
import { formatTurkishDate } from "@/features/study/calendar";
import { ExamLineChart } from "./exam-line-chart";

const EXAMS_HREF = "/ogrenci/denemeler";

export function ExamAnalysisCard({
  analysis,
  className,
}: {
  analysis: ExamAnalysis;
  className?: string;
}) {
  const { latest } = analysis;

  return (
    <Card
      title="Deneme Analizi"
      icon={<TrendIcon />}
      headingLevel={3}
      description="Kaydettiğin denemelerde puan ve netlerin zaman içinde nasıl değiştiği."
      className={className}
    >
      {!latest ? (
        <StateMessage
          variant="empty"
          title="Henüz deneme kaydın yok."
          description="İlk denemeni yazınca puanın ve netlerin burada görünür."
          action={
            <ButtonLink href="/ogrenci/denemeler/yeni" variant="secondary">
              Deneme ekle
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid min-w-0 gap-5">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)] lg:gap-x-6">
            <Headline analysis={analysis} />
            <Comparison analysis={analysis} />
            <Charts analysis={analysis} />
          </div>
          <ValuesTable analysis={analysis} />
          <div>
            <ButtonLink href={EXAMS_HREF} variant="secondary">
              Tüm denemeler
            </ButtonLink>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Latest score (largest figure on the card), exam name and date, and its net. */
function Headline({ analysis }: { analysis: ExamAnalysis }) {
  const { latest, latestScore, latestNet } = analysis;
  if (!latest) return null;

  return (
    <div className="grid min-w-0 content-start gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-700">Son deneme puanı</p>
        {latestScore !== null ? (
          <p
            data-testid="latest-score"
            className="mt-1 text-metric-lg font-extrabold tabular-nums text-ink-900"
          >
            {formatExamScore(latestScore)}
          </p>
        ) : (
          <>
            <p className="mt-1 text-card-title font-bold text-ink-900">Puan kaydı yok</p>
            <p className="mt-1 text-helper text-ink-600">
              Bu denemeye puan yazılmamış. Net yine de aşağıda görünür.
            </p>
          </>
        )}
        <p className="mt-2 font-semibold break-words text-ink-900">{latest.title}</p>
        <p className="text-helper break-words text-ink-600">
          {formatTurkishDate(latest.takenOn)} · {EXAM_TYPE_LABELS[latest.examType]}
        </p>
      </div>
      <dl>
        <Metric label="Son deneme neti">
          {latestNet !== null ? (
            <>
              <span className="text-2xl font-extrabold tabular-nums text-ink-900">
                {formatNet(latestNet)}
              </span>
              <span className="text-sm font-bold text-ink-700">soru neti</span>
            </>
          ) : (
            <NoData />
          )}
        </Metric>
      </dl>
    </div>
  );
}

/** Differences to the previous exam. Hidden until a previous exam of the same type exists. */
function Comparison({ analysis }: { analysis: ExamAnalysis }) {
  const { previous, scoreChange, netChange } = analysis;

  if (!previous) {
    return (
      <p className="text-helper text-ink-600 lg:col-span-2 lg:row-start-2">
        Karşılaştırma için aynı türden bir deneme daha gerekir.
      </p>
    );
  }
  return (
    <div className="grid min-w-0 gap-2 lg:col-span-2 lg:row-start-2">
      <p className="text-helper break-words text-ink-600">
        Önceki denemeye göre ({previous.title}, {formatTurkishDate(previous.takenOn)}):
      </p>
      <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Metric label="Puan farkı">
          <ChangeValue change={scoreChange} unit="puan" maxDigits={2} />
        </Metric>
        <Metric label="Net farkı">
          <ChangeValue change={netChange} unit="net" maxDigits={2} minDigits={2} />
        </Metric>
      </dl>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-card border border-border bg-surface-muted px-3 py-2">
      <dt className="text-sm font-semibold break-words text-ink-700">{label}</dt>
      <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        {children}
      </dd>
    </div>
  );
}

function NoData() {
  return <span className="text-base font-semibold text-ink-700">Veri yok</span>;
}

const CHANGE_WORDS = { up: "arttı", down: "azaldı", same: "değişmedi" } as const;
const CHANGE_MARKS = { up: "▲", down: "▼", same: "＝" } as const;

function ChangeValue({
  change,
  unit,
  maxDigits,
  minDigits = 0,
}: {
  change: AnalysisChange | null;
  unit: string;
  maxDigits: number;
  minDigits?: number;
}) {
  if (!change) return <NoData />;
  return (
    <>
      <span className="text-2xl font-extrabold tabular-nums text-ink-900">
        <span aria-hidden="true" className="mr-1 text-base">
          {CHANGE_MARKS[change.direction]}
        </span>
        {formatSignedChange(change.delta, maxDigits, minDigits)}
      </span>
      <span className="text-sm font-bold text-ink-700">
        {unit} {CHANGE_WORDS[change.direction]}
      </span>
    </>
  );
}

function Charts({ analysis }: { analysis: ExamAnalysis }) {
  const { latest, series, scorePoints, netPoints, excludedOtherType, truncated } =
    analysis;
  if (!latest) return null;

  return (
    <div className="grid min-w-0 content-start gap-4 lg:col-start-2 lg:row-start-1">
      <p className="text-helper text-ink-600">
        {EXAM_TYPE_LABELS[latest.examType]} · {series.length} deneme ·{" "}
        {formatTurkishDate(series[0]!.takenOn)} – {formatTurkishDate(latest.takenOn)}
      </p>
      <div className="grid min-w-0 gap-6 md:grid-cols-2">
        <ExamLineChart
          title="Puan gelişimi"
          unit="puan (0–500)"
          points={scorePoints}
          formatValue={(value) => formatExamScore(value)}
          hardMax={500}
          emptyText="Bu denemelerde puan kaydı yok."
        />
        <ExamLineChart
          title="Net gelişimi"
          unit="toplam net (soru neti)"
          points={netPoints}
          formatValue={formatNet}
          emptyText="Bu denemelerde net kaydı yok."
        />
      </div>
      {truncated ? (
        <p className="text-helper text-ink-600">
          Grafikte en yeni {series.length} deneme var.
        </p>
      ) : null}
      {excludedOtherType > 0 ? (
        <p className="text-helper text-ink-600">
          {excludedOtherType} deneme farklı türde olduğu için bu grafiklere alınmadı. Soru
          sayıları farklı olduğundan karşılaştırılmaz.
        </p>
      ) : null}
    </div>
  );
}

function ValuesTable({ analysis }: { analysis: ExamAnalysis }) {
  return (
    <details className="min-w-0 rounded-card border border-border bg-surface">
      <summary className="flex min-h-touch cursor-pointer items-center px-3 text-sm font-semibold text-ink-900">
        Grafiklerin değerlerini tablo olarak göster
      </summary>
      <div className="p-3 pt-0">
        <TableScroll label="Deneme puanları ve netleri tablosu">
          <table className={tableClassName}>
            <caption className="sr-only">
              Grafiklerle aynı kayıtlar. Puan ve net ayrı birimlerdir. Kayıt yok yazan
              hücrede değer girilmemiştir.
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
                  Puan
                </th>
                <th scope="col" className={thClassName}>
                  Net
                </th>
              </tr>
            </thead>
            <tbody>
              {analysis.series.map((exam) => (
                <tr key={exam.id}>
                  <th scope="row" className={`${tdClassName} min-w-32`}>
                    {exam.title}
                  </th>
                  <td className={`${tdClassName} whitespace-nowrap`}>
                    {formatTurkishDate(exam.takenOn)}
                  </td>
                  <td className={`${tdClassName} tabular-nums`}>
                    {formatExamScore(exam.score)}
                  </td>
                  <td className={`${tdClassName} tabular-nums`}>
                    {exam.totalNet === null ? "Kayıt yok" : formatNet(exam.totalNet)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>
    </details>
  );
}

function TrendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19h16M5 15l4-4 3 3 6-7" />
      <path d="M15 7h3v3" />
    </svg>
  );
}
