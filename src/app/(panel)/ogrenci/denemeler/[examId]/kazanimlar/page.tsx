import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { MistakeForm } from "@/features/outcomes/components/mistake-form";
import { loadExamMistakes } from "@/features/outcomes/load-analysis";
import { OUTCOME_MESSAGES } from "@/features/outcomes/messages";
import { formatTurkishDate } from "@/features/study/calendar";

export const metadata: Metadata = { title: "Kazanım eşleştirme" };
export const instant = false;

const STATUS: Record<string, string> = {
  kaydedildi: OUTCOME_MESSAGES.saved,
};

export default function ExamOutcomesPage({
  params,
  searchParams,
}: PageProps<"/ogrenci/denemeler/[examId]/kazanimlar">) {
  return (
    <Suspense
      fallback={<StateMessage variant="loading" title="Eşleştirmeler yükleniyor..." />}
    >
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function Content({
  params,
  searchParams,
}: Pick<PageProps<"/ogrenci/denemeler/[examId]/kazanimlar">, "params" | "searchParams">) {
  const user = await requireStudent();
  const { examId } = await params;
  const query = await searchParams;
  const loaded = await loadExamMistakes(user.id, examId);
  if (!loaded) notFound();

  const catalog = await loadCatalog({ includeArchived: false });
  const status = STATUS[one(query.durum)];

  return (
    <>
      <PageHeader
        title="Kazanım eşleştirme"
        description={`${loaded.exam.title} · ${formatTurkishDate(loaded.exam.takenOn)}. Her yanlış ve her boş soru için bir kazanım listesi açılır. Seçmediğin soru bağlanmamış kalır.`}
      />
      {status ? <StateMessage variant="success" title={status} /> : null}
      <Card className="mb-4">
        <MistakeForm
          examId={loaded.exam.id}
          catalog={catalog}
          subjects={loaded.exam.subjects.map((subject) => ({
            resultId: subject.resultId,
            subjectId: subject.subjectId,
            subjectName: subject.subjectName,
            wrongCount: subject.wrongCount,
            blankCount: subject.blankCount,
          }))}
          initialRows={loaded.mistakes.map((mistake) => ({
            resultId: mistake.resultId,
            kind: mistake.kind,
            outcomeId: mistake.outcomeId,
          }))}
        />
      </Card>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/ogrenci/denemeler/${examId}`} variant="secondary">
          Deneme detayına dön
        </ButtonLink>
        <ButtonLink href="/ogrenci/kazanimlar" variant="secondary">
          Öncelik listesi
        </ButtonLink>
      </div>
    </>
  );
}
