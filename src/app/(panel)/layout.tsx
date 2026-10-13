import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { StateMessage } from "@/components/ui/state-message";
import { homePathFor } from "@/features/auth/paths";
import { requireUser } from "@/features/auth/session";
import { getNavItems } from "@/features/navigation/nav-items";

/** Authenticated routes read the session on every request; they cannot be instant. */
export const instant = false;

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main id={MAIN_CONTENT_ID} className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          <StateMessage variant="loading" title="Sayfa yükleniyor..." />
        </main>
      }
    >
      <PanelFrame>{children}</PanelFrame>
    </Suspense>
  );
}

async function PanelFrame({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell navItems={getNavItems(user.roles)} homeHref={homePathFor(user.roles)}>
      {children}
    </AppShell>
  );
}
