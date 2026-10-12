import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { PreviewBanner } from "@/features/preview/components/preview-banner";
import { PreviewNav } from "@/features/preview/components/preview-nav";
import { isUiPreviewEnabled } from "@/features/preview/preview-gate";

export const metadata: Metadata = {
  title: { default: "Önizleme", template: "%s (önizleme) | LGS Pusula" },
};

export default function PreviewLayout({ children }: LayoutProps<"/onizleme">) {
  if (!isUiPreviewEnabled()) {
    notFound();
  }

  return (
    <>
      <PreviewBanner />
      <header className="bg-surface">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
          <Link
            href="/onizleme"
            className="min-h-11 content-center text-lg font-extrabold text-brand-700"
          >
            LGS Pusula
          </Link>
        </div>
      </header>
      <PreviewNav />
      <main
        id={MAIN_CONTENT_ID}
        className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 sm:pb-10"
      >
        {children}
      </main>
    </>
  );
}
