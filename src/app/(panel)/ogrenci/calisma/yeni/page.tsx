import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { istanbulToday } from "@/features/study/calendar";
import { StudyLogForm } from "@/features/study/components/study-log-form";

export const metadata: Metadata = { title: "Yeni çalışma kaydı" };
export const instant = false;

export default function NewStudyLogPage({
  searchParams,
}: PageProps<"/ogrenci/calisma/yeni">) {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Form yükleniyor..." />}>
      <NewStudyLog searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function NewStudyLog({
  searchParams,
}: Pick<PageProps<"/ogrenci/calisma/yeni">, "searchParams">) {
  await requireStudent();
  const today = istanbulToday();
  const catalog = await loadCatalog({ includeArchived: false });
  const subjects = catalog.map((subject) => ({ id: subject.id, name: subject.name }));
  const requested = one((await searchParams).ders);
  const subjectId = subjects.some((subject) => subject.id === requested)
    ? requested
    : undefined;

  return (
    <>
      <PageHeader
        title="Yeni çalışma kaydı"
        description="Ders zorunlu. Konu veya kazanım seçmek isteğe bağlı. Soru sayıları eksi olamaz; doğru, yanlış ve boş toplamı soru sayısına eşit olmalı."
      />
      <Card>
        {subjects.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Ders listesi henüz hazır değil."
            description="Yönetici dersleri ekleyince kayıt yazabilirsin."
          />
        ) : (
          <StudyLogForm
            mode="create"
            catalog={catalog}
            subjects={subjects}
            today={today}
            defaults={subjectId ? { subjectId } : undefined}
          />
        )}
      </Card>
    </>
  );
}
