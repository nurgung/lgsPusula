import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ComponentsDemo } from "@/features/preview/components/components-demo";

export const metadata: Metadata = { title: "Bileşenler" };

export default function ComponentsPreviewPage() {
  return (
    <>
      <PageHeader
        title="Bileşenler"
        description="Formlar, onay penceresi ve bildirimler. Bu sayfa hiçbir bilgiyi kaydetmez."
      />
      <ComponentsDemo />
    </>
  );
}
