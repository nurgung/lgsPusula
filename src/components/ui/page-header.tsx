import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  compact = false,
}: {
  title: string;
  description?: ReactNode;
  /** Pulls the title closer to the next block on narrow screens. From `sm`, the regular gap stays. */
  compact?: boolean;
}) {
  return (
    <header className={compact ? "mb-3 sm:mb-6" : "mb-6"}>
      <h1 className="text-2xl font-extrabold break-words text-ink-900 sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "max-w-prose break-words text-base text-ink-700",
            compact ? "mt-1 sm:mt-2" : "mt-2",
          )}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
