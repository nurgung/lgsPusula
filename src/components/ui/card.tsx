import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "feature" | "quiet" | "accent";

const shells: Record<CardVariant, string> = {
  default: "border-border bg-surface p-card-y px-card-x shadow-card sm:p-6",
  feature:
    "border-brand-100 bg-surface p-5 shadow-raised sm:rounded-panel sm:p-8",
  quiet: "border-border bg-surface-muted p-card-y px-card-x shadow-none sm:p-5",
  /** Cool secondary surface for week / exam / badge-style summary blocks. */
  accent: "border-accent-100 bg-accent-50 p-card-y px-card-x shadow-soft sm:p-5",
};

const titles: Record<CardVariant, string> = {
  default: "text-card-title font-bold",
  feature: "text-section font-extrabold tracking-tight sm:text-2xl",
  quiet: "text-base font-bold",
  accent: "text-card-title font-bold",
};

type CardProps = {
  title?: string;
  description?: ReactNode;
  headingLevel?: 2 | 3;
  variant?: CardVariant;
  className?: string;
  children?: ReactNode;
};

export function Card({
  title,
  description,
  headingLevel = 2,
  variant = "default",
  className,
  children,
}: CardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className={cn("min-w-0 rounded-card border", shells[variant], className)}>
      {title ? (
        <Heading className={cn("break-words text-ink-900", titles[variant])}>
          {title}
        </Heading>
      ) : null}
      {description ? <p className="mt-1 text-helper text-ink-600">{description}</p> : null}
      {children ? (
        <div className={title || description ? "mt-4" : undefined}>{children}</div>
      ) : null}
    </section>
  );
}
