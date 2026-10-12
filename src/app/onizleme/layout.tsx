import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PreviewBanner } from "@/features/preview/components/preview-banner";
import { PREVIEW_NAV_ITEMS } from "@/features/preview/preview-nav-items";
import { isUiPreviewEnabled } from "@/features/preview/preview-gate";

export const metadata: Metadata = {
  title: { default: "Önizleme", template: "%s (önizleme) | LGS Pusula" },
};

export default function PreviewLayout({ children }: LayoutProps<"/onizleme">) {
  if (!isUiPreviewEnabled()) {
    notFound();
  }

  return (
    <AppShell
      navItems={PREVIEW_NAV_ITEMS}
      homeHref="/onizleme"
      banner={<PreviewBanner />}
    >
      {children}
    </AppShell>
  );
}
