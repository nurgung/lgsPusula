import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MASCOT_MESSAGES } from "@/features/mascot/messages";
import { tasksFor, type TaskFacts } from "@/features/mascot/rules";

type ChecklistTask = {
  id: string;
  title: string;
  done: boolean;
  href?: string;
};

export function DailyGoals({
  facts,
  linked = true,
}: {
  facts: TaskFacts;
  /** The dialog lists the same rows without extra links, so Tamam stays the only action. */
  linked?: boolean;
}) {
  const tasks = tasksFor(facts);
  return (
    <Card
      title="Bugünün hedefleri"
      description="Tamamlanan satır işaretli. Bir gün ara vermek bunları silmez."
    >
      <TaskChecklist tasks={tasks} linked={linked} />
    </Card>
  );
}

export function TaskChecklist({
  tasks,
  linked,
}: {
  tasks: readonly ChecklistTask[];
  linked: boolean;
}) {
  return (
    <ul className="grid min-w-0 gap-3">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="grid min-w-0 gap-2 rounded-xl border border-border bg-surface p-3"
        >
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <p className="flex min-w-0 items-start gap-2 font-semibold break-words text-ink-900">
              <span aria-hidden="true">{task.done ? "✓" : "○"}</span>
              <span>{task.title}</span>
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
  );
}
