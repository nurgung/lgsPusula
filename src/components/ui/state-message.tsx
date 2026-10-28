import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StateVariant = "loading" | "empty" | "error" | "success" | "info";

const styles: Record<StateVariant, { box: string; label: string }> = {
  loading: { box: "border-border bg-surface text-ink-700 shadow-soft", label: "Yükleniyor" },
  empty: { box: "border-border bg-surface-muted text-ink-700", label: "Henüz veri yok" },
  error: { box: "border-danger-700/40 bg-danger-50 text-danger-700", label: "Hata" },
  success: {
    box: "border-success-700/40 bg-success-50 text-success-700",
    label: "Başarılı",
  },
  info: { box: "border-info-700/30 bg-info-50 text-info-700", label: "Bilgi" },
};

function StateIcon({ variant }: { variant: StateVariant }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("shrink-0", variant === "loading" && "animate-spin"),
  };
  switch (variant) {
    case "loading":
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-6.2-8.56" />
        </svg>
      );
    case "error":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      );
    case "success":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "empty":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
  }
}

type StateMessageProps = {
  variant: StateVariant;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Shared loading / empty / error / success / info state. Meaning is always carried by
 * text (a visible label and title), never by colour alone.
 */
export function StateMessage({
  variant,
  title,
  description,
  action,
  className,
}: StateMessageProps) {
  const role =
    variant === "error"
      ? "alert"
      : variant === "info" || variant === "empty"
        ? undefined
        : "status";
  return (
    <div
      role={role}
      aria-busy={variant === "loading" ? true : undefined}
      className={cn("flex gap-3 rounded-card border p-4", styles[variant].box, className)}
    >
      <StateIcon variant={variant} />
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-wide uppercase">
          {styles[variant].label}
        </p>
        <p className="font-semibold text-ink-900">{title}</p>
        {description ? (
          <div className="mt-1 text-sm text-ink-700">{description}</div>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
