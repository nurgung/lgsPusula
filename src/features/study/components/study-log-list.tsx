import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { formatTurkishDate } from "@/features/study/calendar";
import type { StudyLogView } from "@/features/study/summary";

export function StudyLogList({
  logs,
  editable,
  emptyTitle = "Bu tarihlerde kayıt yok.",
  emptyDescription = "Çalışmanı yazınca burada görürsün. Bir gün ara vermen bir sorun değil.",
}: {
  logs: readonly StudyLogView[];
  editable: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (logs.length === 0) {
    return (
      <StateMessage variant="empty" title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <ul className="grid min-w-0 gap-3">
      {logs.map((log) => (
        <li
          key={log.id}
          className="grid min-w-0 gap-2 rounded-xl border border-border p-3"
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold break-words text-ink-900">{log.subjectName}</h3>
            <p className="text-sm text-ink-700">{formatTurkishDate(log.studiedOn)}</p>
          </div>
          <p className="text-ink-900">
            {log.questionCount} soru · {log.correctCount} doğru, {log.wrongCount} yanlış,{" "}
            {log.blankCount} boş
          </p>
          <p className="text-ink-700">{log.durationMinutes} dakika</p>
          {log.topicName ? (
            <p className="break-words text-sm text-ink-700">
              {log.outcomeCode ? `${log.outcomeCode} · ` : "Konu: "}
              {log.topicName}
            </p>
          ) : (
            <p className="text-sm text-ink-600">Konu seçilmedi.</p>
          )}
          {editable ? (
            <div>
              <ButtonLink href={`/ogrenci/calisma/${log.id}`} variant="secondary">
                Düzenle
              </ButtonLink>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
