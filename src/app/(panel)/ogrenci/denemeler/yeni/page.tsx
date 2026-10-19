import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { ExamForm } from "@/features/exams/components/exam-form";
import { istanbulToday } from "@/features/study/calendar";

export const metadata: Metadata = { title: "Yeni deneme" };
export const instant = false;

export default function NewExamPage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Form yükleniyor..." />}>
      <NewExam />
    </Suspense>
  );
}

async function NewExam() {
  await requireStudent();
  const today = istanbulToday();
  const catalog = await loadCatalog({ includeArchived: false });
  const subjects = catalog.map((subject) => ({
    id: subject.id,
    code: subject.code,
    name: subject.name,
  }));

  return (
    <>
      <PageHeader
        title="Yeni deneme"
        description="Tam LGS veya branş denemesi seç. Her derste doğru + yanlış + boş = soru sayısı olmalı. Uygulama LGS puanı hesaplamaz; yalnızca net gösterir."
      />
      <Card>
        {subjects.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Ders listesi henüz hazır değil."
            description="Yönetici dersleri ekleyince deneme yazabilirsin."
          />
        ) : (
          <ExamForm mode="create" subjects={subjects} today={today} />
        )}
      </Card>
    </>
  );
}
