"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { getActiveHref, type NavItem } from "@/lib/navigation";

// Static class names (no inline style) so a strict style CSP keeps working.
const BOTTOM_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

type AppNavProps = {
  items: readonly NavItem[];
  /** "bottom": fixed bar for small screens. "top": inline links in the header. */
  placement: "bottom" | "top";
  className?: string;
};

export function AppNav({ items, placement, className }: AppNavProps) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname, items);
  if (items.length === 0) return null;

  if (placement === "top") {
    return (
      <nav aria-label="Ana menü" className={className}>
        <ul className="flex flex-wrap gap-1">
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-xl px-3 font-semibold",
                    active
                      ? "bg-brand-50 text-brand-800 underline decoration-2 underline-offset-8"
                      : "text-ink-700 hover:bg-brand-50 hover:text-brand-700",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Ana menü"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <ul className={cn("mx-auto grid max-w-5xl", BOTTOM_COLUMNS[items.length])}>
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center justify-center px-1 text-center leading-tight font-semibold break-words",
                  items.length >= 5 ? "text-xs" : "text-sm",
                  active
                    ? "text-brand-800 underline decoration-2 underline-offset-8"
                    : "text-ink-700 hover:text-brand-700",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
