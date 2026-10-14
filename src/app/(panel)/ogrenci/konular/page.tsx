import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { TopicBrowser } from "@/features/curriculum/components/topic-browser";
import { loadCatalog } from "@/features/curriculum/load-catalog";

export const metadata: Metadata = { title: "Konular" };
export const instant = false;

export default function StudentTopicsPage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Konular yükleniyor..." />}>
      <StudentTopics />
    </Suspense>
  );
}

async function StudentTopics() {
  await requireStudent();
  const catalog = await loadCatalog({ includeArchived: false });

  return (
    <>
      <PageHeader
        title="Konular"
        description="Derslerin konularını ve kazanımlarını burada bulabilirsin. Çalışma kaydı ekleme sonraki aşamada gelecek; orada da bu listeden seçeceksin."
      />
      <TopicBrowser catalog={catalog} />
    </>
  );
}
