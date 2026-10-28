import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { EXAM_TYPE_LABELS } from "@/features/exams/labels";
import { formatNet, type ExamType } from "@/features/exams/net-rules";
import { formatTurkishDate, formatTurkishDateRange } from "@/features/study/calendar";
import type { PeriodSummary } from "@/features/study/summary";

export type HomeExamSummary = {
  id: string;
  title: string;
  takenOn: string;
  examType: ExamType;
  totalNet: number;
};

export function WeekAndExamSummary({
  summary,
  exam,
}: {
  summary: PeriodSummary;
  exam: HomeExamSummary | null;
}) {
  return (
    <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-2">
      <WeekSummary summary={summary} />
      <LatestExam exam={exam} />
    </div>
  );
}

function WeekSummary({ summary }: { summary: PeriodSummary }) {
  return (
    <Card
      title="Bu hafta"
      icon={<ChartIcon />}
      iconTone="accent"
      headingLevel={3}
      description={formatTurkishDateRange(summary)}
    >
      <div className="grid min-w-0 gap-4">
        {summary.questionCount === 0 ? (
          <StateMessage
            variant="empty"
            title="Bu hafta henüz çalışma kaydı yok."
            description="Kayıt yazınca toplam burada görünür. Bir gün ara vermen bir sorun değil."
          />
        ) : (
          <dl className="grid min-w-0 gap-4">
            <Measure label="Toplam soru" value={summary.questionCount} prominent />
            <div className="grid min-w-0 grid-cols-2 gap-3">
              <Measure label="Doğru cevap" value={summary.correctCount} />
              <Measure label="Süre" value={summary.durationMinutes} unit="dakika" />
            </div>
          </dl>
        )}
        <div>
          <ButtonLink href="/ogrenci/calisma" variant="secondary">
            Çalışma kayıtları
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

function LatestExam({ exam }: { exam: HomeExamSummary | null }) {
  return (
    <Card title="Son deneme" icon={<SheetIcon />} headingLevel={3}>
      <div className="grid min-w-0 gap-4">
        {exam ? (
          <div className="grid min-w-0 gap-3">
            <p className="font-semibold break-words text-ink-900">{exam.title}</p>
            <p className="text-sm break-words text-ink-600">
              <span>{formatTurkishDate(exam.takenOn)}</span>
              <span> · {EXAM_TYPE_LABELS[exam.examType]}</span>
            </p>
            <dl className="min-w-0">
              <Measure label="Net" value={formatNet(exam.totalNet)} unit="soru neti" prominent />
            </dl>
          </div>
        ) : (
          <StateMessage
            variant="empty"
            title="Henüz deneme kaydın yok."
            description="Deneme sonucunu yazınca özeti burada görürsün."
          />
        )}
        <div>
          {exam ? (
            <ButtonLink href={`/ogrenci/denemeler/${exam.id}`} variant="secondary">
              Denemeye bak
            </ButtonLink>
          ) : (
            <ButtonLink href="/ogrenci/denemeler/yeni" variant="secondary">
              Deneme ekle
            </ButtonLink>
          )}
        </div>
      </div>
    </Card>
  );
}

function Measure({
  label,
  value,
  unit,
  prominent = false,
}: {
  label: string;
  value: number | string;
  unit?: string;
  prominent?: boolean;
}) {
  return (
    <div
      className={
        prominent
          ? "min-w-0"
          : "min-w-0 rounded-xl border border-border bg-surface p-3"
      }
    >
      <dt className="text-sm font-semibold break-words text-ink-700">{label}</dt>
      <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={
            prominent
              ? "text-5xl font-extrabold tabular-nums leading-none break-words text-ink-900"
              : "text-3xl font-extrabold tabular-nums leading-none break-words text-ink-900"
          }
        >
          {value}
        </span>
        {unit ? (
          <span className="text-sm font-bold break-words text-ink-700">{unit}</span>
        ) : null}
      </dd>
    </div>
  );
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function ChartIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 20V11M12 20V5M19 20v-7" />
    </svg>
  );
}

function SheetIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 3h8l4 4v14H7V3Z" />
      <path d="M15 3v4h4M10 12h6M10 16h6" />
    </svg>
  );
}
