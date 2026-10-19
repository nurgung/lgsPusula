import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { ExamList } from "@/features/exams/components/exam-list";
import { EXAM_MESSAGES } from "@/features/exams/messages";
import { loadExamList } from "@/features/exams/load-exams";
import {
  formatTurkishDateRange,
  istanbulToday,
  recentListWindow,
} from "@/features/study/calendar";

export const metadata: Metadata = { title: "Denemeler" };
export const instant = false;

const STATUS: Record<string, string> = {
  kaydedildi: EXAM_MESSAGES.saved,
  guncellendi: EXAM_MESSAGES.updated,
  silindi: EXAM_MESSAGES.deleted,
};

export default function ExamsPage({ searchParams }: PageProps<"/ogrenci/denemeler">) {
  return (
    <Suspense
      fallback={<StateMessage variant="loading" title="Denemelerin yükleniyor..." />}
    >
      <ExamsContent searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function ExamsContent({
  searchParams,
}: Pick<PageProps<"/ogrenci/denemeler">, "searchParams">) {
  const user = await requireStudent();
  const params = await searchParams;
  const today = istanbulToday();
  const listWindow = recentListWindow(today);
  const exams = await loadExamList(user.id, listWindow);
  const status = STATUS[one(params.durum)];

  return (
    <>
      <PageHeader
        title="Denemeler"
        description={`Son ${formatTurkishDateRange(listWindow)} arası denemelerin. Net = doğru − (yanlış ÷ 3). Toplam net eksi olursa 0 alınır.`}
      />
      {status ? <StateMessage variant="success" title={status} /> : null}
      <div className="mb-4">
        <ButtonLink href="/ogrenci/denemeler/yeni">Yeni deneme</ButtonLink>
      </div>
      <Card>
        <ExamList exams={exams} editable />
      </Card>
    </>
  );
}
