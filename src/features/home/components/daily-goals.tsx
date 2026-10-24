import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { tasksFor, type TaskFacts } from "@/features/mascot/rules";
import { cn } from "@/lib/cn";

type ChecklistTask = {
  id: string;
  title: string;
  done: boolean;
  href?: string;
};

export function DailyGoals({
  facts,
  linked = true,
  embedded = false,
}: {
  facts: TaskFacts;
  /** The dialog lists the same rows without extra links, so Tamam stays the only action. */
  linked?: boolean;
  /** Home nests the list under one card with the question goals. */
  embedded?: boolean;
}) {
  const tasks = tasksFor(facts);
  const list = (
    <TaskChecklist tasks={tasks} linked={linked} emphasizeOpen={embedded} />
  );
  if (embedded) return list;
  return (
    <Card
      title="Bugünün hedefleri"
      description="Tamamlanan satır işaretli. Bir gün ara vermek bunları silmez."
    >
      {list}
    </Card>
  );
}

export function TaskChecklist({
  tasks,
  linked,
  emphasizeOpen = false,
}: {
  tasks: readonly ChecklistTask[];
  linked: boolean;
  /** Home puts open rows first. The celebration dialog keeps the original order. */
  emphasizeOpen?: boolean;
}) {
  const ordered = emphasizeOpen
    ? [...tasks].sort((a, b) => Number(a.done) - Number(b.done))
    : [...tasks];
  const allDone = ordered.length > 0 && ordered.every((task) => task.done);

  return (
    <div className="grid min-w-0 gap-3">
      {emphasizeOpen && allDone ? (
        <p className="rounded-xl border border-success-700/40 bg-success-50 px-3 py-2 text-sm font-semibold text-success-700">
          <span aria-hidden="true">✓ </span>
          {MASCOT_MESSAGES.tasksAllDoneTitle}
        </p>
      ) : null}
      <ul className="grid min-w-0 gap-2" aria-label="Görevler">
        {ordered.map((task) => (
          <li
            key={task.id}
            className={cn(
              "grid min-w-0 gap-2 rounded-xl border p-3",
              task.done
                ? "border-border bg-surface"
                : "border-2 border-brand-700 bg-brand-50",
            )}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <p className="flex min-w-0 items-start gap-2 font-semibold break-words text-ink-900">
                <span aria-hidden="true">{task.done ? "✓" : "○"}</span>
                <span>{task.title}</span>
              </p>
              <span
                className={
                  task.done
                    ? "rounded-full bg-success-50 px-2 py-1 text-sm font-bold text-success-700"
                    : "rounded-full bg-brand-100 px-2 py-1 text-sm font-bold text-ink-900"
                }
              >
                {task.done ? MASCOT_MESSAGES.taskDone : MASCOT_MESSAGES.taskOpen}
              </span>
            </div>
            {linked && !task.done && task.href ? (
              <div>
                <ButtonLink href={task.href} variant="secondary">
                  {task.id === "review_outcome" ? "Kazanımlara bak" : "Kayıt ekle"}
                </ButtonLink>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
