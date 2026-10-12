import type { ReactNode } from "react";

/**
 * Controlled horizontal scroll for tables on narrow screens. Focusable so keyboard users
 * can scroll; the label is announced as a region name.
 */
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="max-w-full overflow-x-auto rounded-xl border border-border"
    >
      {children}
    </div>
  );
}

export const tableClassName = "w-full border-collapse text-left text-sm";
export const thClassName =
  "border-b border-border bg-canvas px-2 py-2 font-semibold text-ink-700 sm:px-3";
export const tdClassName = "border-b border-border px-2 py-2 text-ink-900 sm:px-3";
