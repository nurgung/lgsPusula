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
    <Card
      title="Bu hafta"
      description={`${formatTurkishDateRange(summary)} · soru ve dakika`}
    >
      <div className="grid min-w-0 gap-5">
        {summary.questionCount === 0 ? (
          <StateMessage
            variant="empty"
            title="Bu hafta henüz çalışma kaydı yok."
            description="Kayıt yazınca toplam burada, derslere göre sayılar ders kutularında görünür. Bir gün ara vermen bir sorun değil."
          />
        ) : (
          <div className="grid min-w-0 gap-2">
            <p className="font-semibold text-ink-900 tabular-nums">
              Toplam {summary.questionCount} soru · {summary.correctCount} doğru,{" "}
              {summary.wrongCount} yanlış, {summary.blankCount} boş ·{" "}
              {summary.durationMinutes} dakika
            </p>
            <p className="text-sm text-ink-700">
              Derslere göre soru sayısı ders kutularında.
            </p>
          </div>
        )}

        <section
          className="grid min-w-0 gap-3 border-t border-border pt-4"
          aria-labelledby="son-deneme"
        >
          <h3 id="son-deneme" className="text-base font-bold text-ink-900">
            Son deneme
          </h3>
          {exam ? (
            <div className="grid min-w-0 gap-1">
              <p className="font-semibold break-words text-ink-900">{exam.title}</p>
              <p className="text-ink-700">
                {formatTurkishDate(exam.takenOn)} · {EXAM_TYPE_LABELS[exam.examType]}
              </p>
              <p className="text-ink-900 tabular-nums">
                Toplam net {formatNet(exam.totalNet)}
              </p>
            </div>
          ) : (
            <StateMessage
              variant="empty"
              title="Henüz deneme kaydın yok."
              description="Deneme sonucunu yazınca özeti burada görürsün."
            />
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/ogrenci/calisma" variant="secondary">
            Çalışma kayıtları
          </ButtonLink>
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
