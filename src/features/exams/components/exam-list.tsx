import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { formatTurkishDate } from "@/features/study/calendar";
import { EXAM_TYPE_LABELS } from "@/features/exams/labels";
import { formatNet } from "@/features/exams/net-rules";
import type { ExamListItem } from "@/services/supabase/exam-store";

export function ExamList({
  exams,
  editable,
  emptyTitle = "Bu tarihlerde deneme yok.",
  emptyDescription = "Deneme sonucunu yazınca burada görürsün. Bir gün ara vermen bir sorun değil.",
}: {
  exams: readonly ExamListItem[];
  editable: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (exams.length === 0) {
    return (
      <StateMessage variant="empty" title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <ul className="grid min-w-0 gap-3">
      {exams.map((exam) => (
        <li
          key={exam.id}
          className="grid min-w-0 gap-2 rounded-xl border border-border p-3"
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold break-words text-ink-900">{exam.title}</h3>
            <p className="text-sm text-ink-700">{formatTurkishDate(exam.takenOn)}</p>
          </div>
          <p className="text-ink-900">
            {EXAM_TYPE_LABELS[exam.examType]} · Toplam net {formatNet(exam.totalNet)}
          </p>
          <p className="text-sm text-ink-600">Kural: {exam.ruleVersion}</p>
          {editable ? (
            <div>
              <ButtonLink href={`/ogrenci/denemeler/${exam.id}`} variant="secondary">
                Detay / düzenle
              </ButtonLink>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
