import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = {
  title?: string;
  description?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
  children?: ReactNode;
};

export function Card({
  title,
  description,
  headingLevel = 2,
  className,
  children,
}: CardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section
      className={cn(
        "min-w-0 rounded-card border border-border bg-surface p-4 shadow-card sm:p-6",
        className,
      )}
    >
      {title ? (
        <Heading className="text-lg font-bold text-ink-900">{title}</Heading>
      ) : null}
      {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
      {children ? (
        <div className={title || description ? "mt-4" : undefined}>{children}</div>
      ) : null}
    </section>
  );
}
