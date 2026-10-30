import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { StateMessage } from "@/components/ui/state-message";

export type SubjectTileGoal = {
  id: string;
  periodLabel: string;
  doneQuestions: number;
  targetQuestions: number;
  met: boolean;
};

export type SubjectTileModel = {
  id: string;
  name: string;
  /** Questions from this week's study logs. Omitted when the week was not loaded. */
  weekQuestions?: number;
  goals?: readonly SubjectTileGoal[];
};

export function SubjectTiles({
  subjects,
  weekLabel,
}: {
  subjects: readonly SubjectTileModel[];
  weekLabel?: string;
}) {
  const countsKnown = subjects.length > 0 && subjects.every((subject) => subject.weekQuestions != null);
  const anyQuestions = subjects.some((subject) => (subject.weekQuestions ?? 0) > 0);
  const description = !countsKnown
    ? "Bir derse dokununca bugünün kayıt formu o ders seçili açılır."
    : anyQuestions
      ? `${weekLabel ? `${weekLabel}. ` : ""}Soru sayısı bu haftanın kayıtlarından. Bir derse dokununca kayıt formu o ders seçili açılır.`
      : undefined;

  return (
    <Card title="Dersler" description={description}>
      {subjects.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Ders listesi henüz hazır değil."
          description="Yönetici dersleri ekleyince karolar burada görünür."
        />
      ) : (
        <div className="grid min-w-0 gap-3">
          {countsKnown && !anyQuestions ? (
            <StateMessage
              variant="empty"
              title="Bu hafta henüz ders kaydı yok."
              description={
                weekLabel
                  ? `${weekLabel} arasında kayıt yok. Bir derse dokununca kayıt formu o ders seçili açılır. Soru sayısı, kayıt yazılınca burada görünür.`
                  : "Bir derse dokununca kayıt formu o ders seçili açılır. Soru sayısı, kayıt yazılınca burada görünür."
              }
            />
          ) : null}
          <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            {subjects.map((subject) => {
              const goals = subject.goals ?? [];
              const showCount =
                subject.weekQuestions != null &&
                (anyQuestions || goals.length > 0);
              return (
                <li key={subject.id} className="min-w-0">
                  <Link
                    href={`/ogrenci/calisma/yeni?ders=${encodeURIComponent(subject.id)}`}
                    className="flex h-full min-h-11 min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4 break-words text-ink-900 hover:bg-brand-50"
                  >
                    <span
                      title={subject.name}
                      className="text-base font-bold leading-snug break-words"
                    >
                      {subject.name}
                    </span>
                    {showCount || goals.length > 0 ? (
                      <div className="mt-auto grid min-w-0 gap-3">
                        {showCount ? (
                          <p className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-sm font-semibold text-ink-700">Bu hafta</span>{" "}
                            <span className="text-3xl font-extrabold tabular-nums leading-none">
                              {subject.weekQuestions}
                            </span>{" "}
                            <span className="text-sm font-bold text-ink-700">soru</span>
                          </p>
                        ) : null}
                        {goals.map((goal) => (
                          <div key={goal.id} className="grid min-w-0 gap-1">
                            <ProgressMeter
                              label={goal.periodLabel}
                              value={goal.doneQuestions}
                              max={goal.targetQuestions}
                              unit="soru"
                              track="quiet"
                            />
                            <p
                              className={
                                goal.met
                                  ? "w-fit rounded-full bg-success-50 px-2 py-1 text-sm font-semibold text-success-700"
                                  : "text-sm text-ink-700"
                              }
                            >
                              {goal.met
                                ? "Hedefe ulaştın."
                                : `Kalan ${Math.max(0, goal.targetQuestions - goal.doneQuestions)} soru.`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
