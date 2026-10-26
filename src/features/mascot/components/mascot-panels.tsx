import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { dismissReminderAction } from "../actions";
import type { GrowthView } from "../growth";
import { MASCOT_MESSAGES } from "../messages";
import { badgesFor, tasksFor, type RewardEvent, type TaskFacts } from "../rules";
import { speciesByCode, type SpeciesCode } from "../species";
import { CharacterStatus } from "./character-status";

export function ReminderCard({ noticeId }: { noticeId: string }) {
  return (
    <section
      className="grid min-w-0 items-center gap-2 rounded-xl border border-border bg-canvas px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto]"
      aria-labelledby="hatirlatma-baslik"
    >
      <div className="min-w-0">
        <h2 id="hatirlatma-baslik" className="text-sm font-bold break-words text-ink-900">
          {MASCOT_MESSAGES.reminderTitle}
        </h2>
        <p className="min-w-0 text-sm leading-snug break-words text-ink-900">
          {MASCOT_MESSAGES.reminderBody}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ButtonLink href="/ogrenci/calisma/yeni" variant="ghost">
          {MASCOT_MESSAGES.reminderAction}
        </ButtonLink>
        <form action={dismissReminderAction}>
          <input type="hidden" name="noticeId" value={noticeId} />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink-900"
          >
            {MASCOT_MESSAGES.reminderDismiss}
          </button>
        </form>
      </div>
    </section>
  );
}

export function MascotSummaryCard({
  species,
  rewards,
  growth,
  detailed,
}: {
  species: SpeciesCode | null;
  rewards: readonly RewardEvent[];
  growth: GrowthView;
  detailed?: boolean;
}) {
  const chosen = species ? speciesByCode(species) : undefined;
  const badges = badgesFor(rewards);

  return (
    <Card title={chosen ? chosen.name : "Karakterin"}>
      <div className="grid min-w-0 gap-4">
        <CharacterStatus species={species} growth={growth} />
        {detailed ? (
          <section className="grid min-w-0 gap-2" aria-labelledby="rozetler-baslik">
            <h3 id="rozetler-baslik" className="text-base font-bold text-ink-900">
              {MASCOT_MESSAGES.badgesTitle}
            </h3>
            <ul className="grid min-w-0 gap-3">
              {badges.map((badge) => (
                <li key={badge.id} className="min-w-0">
                  <p className="font-semibold text-ink-900">
                    {badge.name}{" "}
                    <span className="font-normal text-ink-600">
                      (
                      {badge.earned
                        ? MASCOT_MESSAGES.badgeEarned
                        : MASCOT_MESSAGES.badgePending}
                      )
                    </span>
                  </p>
                  <p className="text-sm text-ink-600">{badge.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {detailed ? null : (
            <ButtonLink href="/ogrenci/karakter" variant="secondary">
              {chosen ? "Karaktere bak" : "Karakter seç"}
            </ButtonLink>
          )}
          <ButtonLink
            href="/ogrenci/bildirimler"
            variant={detailed ? "secondary" : "ghost"}
          >
            Hatırlatma ayarları
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

export function TaskList({ facts }: { facts: TaskFacts }) {
  const tasks = tasksFor(facts);
  const open = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);
  return (
    <Card
      title={MASCOT_MESSAGES.tasksTitle}
      description="Açık görevler üstte, tamamlananlar altta. Bugünün kayıtlarına göre yenilenir."
    >
      <div className="grid min-w-0 gap-4">
        {open.length === 0 ? (
          <StateMessage
            variant="success"
            title={MASCOT_MESSAGES.tasksAllDoneTitle}
            description={MASCOT_MESSAGES.tasksEmptyDescription}
          />
        ) : (
          <TaskGroup title="Açık" tasks={open} />
        )}
        {done.length > 0 ? <TaskGroup title="Tamamlanan" tasks={done} /> : null}
      </div>
    </Card>
  );
}

function TaskGroup({
  title,
  tasks,
}: {
  title: string;
  tasks: ReturnType<typeof tasksFor>;
}) {
  const headingId = title === "Açık" ? "acik-gorevler" : "tamamlanan-gorevler";
  return (
    <section className="grid min-w-0 gap-3" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-base font-bold text-ink-900">
        {title}
      </h3>
      <ul className="grid min-w-0 gap-3">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={
              task.done
                ? "grid min-w-0 gap-2 rounded-xl border border-success-700/40 bg-success-50 p-3"
                : "grid min-w-0 gap-2 rounded-xl border border-border bg-surface p-3"
            }
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 font-semibold break-words text-ink-900">
                {task.title}
              </p>
              <span
                className={
                  task.done
                    ? "text-sm font-bold text-success-700"
                    : "text-sm font-bold text-ink-700"
                }
              >
                {task.done ? MASCOT_MESSAGES.taskDone : MASCOT_MESSAGES.taskOpen}
              </span>
            </div>
            {task.done ? null : (
              <div>
                <ButtonLink href={task.href} variant="secondary">
                  {task.id === "review_outcome" ? "Kazanımlara bak" : "Kayıt ekle"}
                </ButtonLink>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ParentMascotCard({
  species,
  growth,
}: {
  species: SpeciesCode | null;
  growth: GrowthView;
}) {
  const chosen = species ? speciesByCode(species) : undefined;
  if (!chosen && growth.points === 0 && growth.studyDays === 0) {
    return (
      <Card title="Karakter">
        <StateMessage
          variant="empty"
          title={MASCOT_MESSAGES.parentEmptyTitle}
          description={MASCOT_MESSAGES.parentEmptyDescription}
        />
      </Card>
    );
  }
  return (
    <Card title="Karakter" description={MASCOT_MESSAGES.parentReadOnly}>
      <CharacterStatus species={species} growth={growth} />
    </Card>
  );
}
