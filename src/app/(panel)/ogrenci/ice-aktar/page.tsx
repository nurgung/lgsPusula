import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { ImportForm } from "@/features/import/components/import-form";

export const metadata: Metadata = { title: "İçe aktar" };
export const instant = false;

export default function ImportPage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <ImportContent />
    </Suspense>
  );
}

async function ImportContent() {
  await requireStudent();
  return (
    <>
      <PageHeader
        title="Çalışma kaydı içe aktar"
        description="Dosyadaki satırlar senin hesabına yazılır. Başka bir öğrencinin numarası dosyada olsa da kullanılmaz."
      />
      <ImportForm />
    </>
  );
}
