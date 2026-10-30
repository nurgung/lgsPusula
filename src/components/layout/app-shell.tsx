import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "@/components/layout/app-nav";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import type { NavItem } from "@/lib/navigation";

/**
 * Pages normally stay in a `max-w-5xl` column. A page that needs more room on large screens
 * renders an element with `data-wide-page`; header and main then widen to `max-w-7xl`.
 * Pure CSS (`:has`), so no client code and no change for any other page.
 */
const WIDE_WHEN_REQUESTED = "[body:has([data-wide-page])_&]:max-w-7xl";

type AppShellProps = {
  /** Already filtered for the signed-in user's roles (see `getNavItems`). */
  navItems: readonly NavItem[];
  homeHref: string;
  /** Optional content on the right of the header, e.g. the account menu. */
  headerActions?: ReactNode;
  /** Optional content above the header, e.g. an environment warning. */
  banner?: ReactNode;
  children: ReactNode;
};

/**
 * Page frame: header (with inline menu from `sm` up) and a fixed bottom menu on small
 * screens so main actions stay within thumb reach. Only one of the two menus is visible
 * (and exposed to assistive technology) at a time.
 */
export function AppShell({
  navItems,
  homeHref,
  headerActions,
  banner,
  children,
}: AppShellProps) {
  const hasNav = navItems.length > 0;
  return (
    <>
      {banner}
      <header className="border-b border-border bg-surface">
        <div
          className={`mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 ${WIDE_WHEN_REQUESTED}`}
        >
          <Link
            href={homeHref}
            className="min-h-11 content-center text-lg font-extrabold text-brand-700"
          >
            LGS Pusula
          </Link>
          {hasNav ? (
            <AppNav items={navItems} placement="top" className="hidden sm:block" />
          ) : null}
          {headerActions ? <div className="ml-auto">{headerActions}</div> : null}
        </div>
      </header>
      <main
        id={MAIN_CONTENT_ID}
        className={`mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-10 ${WIDE_WHEN_REQUESTED}`}
      >
        {children}
      </main>
      {hasNav ? (
        <AppNav items={navItems} placement="bottom" className="sm:hidden" />
      ) : null}
    </>
  );
}
