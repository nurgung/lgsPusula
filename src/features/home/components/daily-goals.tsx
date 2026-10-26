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
  const primaryId = emphasizeOpen ? (ordered.find((task) => !task.done)?.id ?? null) : null;

  return (
    <div className="grid min-w-0 gap-3">
      {emphasizeOpen && allDone ? (
        <p className="rounded-xl bg-success-50 px-3 py-2 text-sm font-semibold text-success-700">
          <span aria-hidden="true">✓ </span>
          {MASCOT_MESSAGES.tasksAllDoneTitle}
        </p>
      ) : null}
      <ul className="grid min-w-0 gap-2" aria-label="Görevler">
        {ordered.map((task) => {
          const emphasis = task.done ? "done" : task.id === primaryId ? "primary" : "secondary";
          return emphasizeOpen ? (
            <HomeTaskRow key={task.id} task={task} linked={linked} emphasis={emphasis} />
          ) : (
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
                    {taskActionLabel(task.id)}
                  </ButtonLink>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function taskActionLabel(id: string): string {
  return id === "review_outcome" ? "Kazanımlara bak" : "Kayıt ekle";
}

function HomeTaskRow({
  task,
  linked,
  emphasis,
}: {
  task: ChecklistTask;
  linked: boolean;
  emphasis: "primary" | "secondary" | "done";
}) {
  const done = emphasis === "done";
  return (
    <li
      data-task-emphasis={emphasis}
      className={cn(
        "min-w-0 rounded-card p-3",
        emphasis === "primary" && "bg-brand-50",
        emphasis === "secondary" && "bg-canvas",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <TaskGlyph id={task.id} done={done} prominent={emphasis === "primary"} />
        <div className="grid min-w-0 flex-1 gap-2">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <p
              className={cn(
                "min-w-0 font-bold break-words",
                done ? "text-ink-700" : "text-ink-900",
              )}
            >
              {task.title}
            </p>
            <span
              className={
                done
                  ? "shrink-0 rounded-full bg-success-50 px-2 py-1 text-sm font-bold text-success-700"
                  : emphasis === "primary"
                    ? "shrink-0 rounded-full bg-brand-100 px-2 py-1 text-sm font-bold text-ink-900"
                    : "shrink-0 rounded-full bg-surface px-2 py-1 text-sm font-bold text-ink-700"
              }
            >
              {done ? MASCOT_MESSAGES.taskDone : MASCOT_MESSAGES.taskOpen}
            </span>
          </div>
          {linked && !done && task.href ? (
            <div>
              <ButtonLink
                href={task.href}
                variant={emphasis === "primary" ? "primary" : "secondary"}
                className="w-full sm:w-fit"
              >
                {taskActionLabel(task.id)}
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function TaskGlyph({
  id,
  done,
  prominent,
}: {
  id: string;
  done: boolean;
  prominent: boolean;
}) {
  const chip = cn(
    "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
    done && "bg-success-50 text-success-700",
    !done && prominent && "bg-brand-100 text-brand-800",
    !done && !prominent && "bg-surface text-ink-700",
  );
  if (done) {
    return (
      <span className={cn(chip, "text-lg font-bold")} aria-hidden="true">
        ✓
      </span>
    );
  }
  return (
    <span className={chip}>
      <TaskIcon id={id} />
    </span>
  );
}

function TaskIcon({ id }: { id: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "h-5 w-5",
  };
  if (id === "meet_goal") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    );
  }
  if (id === "review_outcome") {
    return (
      <svg {...common}>
        <path d="M8 7h11M8 12h11M8 17h7" />
        <path d="M4 7h.01M4 12h.01M4 17h.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4M9 12h6M9 16h4" />
    </svg>
  );
}
