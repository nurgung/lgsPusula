import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { describeSelection, encodeSelection } from "@/features/curriculum/catalog";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { istanbulToday } from "@/features/study/calendar";
import { DeleteLogButton } from "@/features/study/components/delete-record-button";
import { StudyLogForm } from "@/features/study/components/study-log-form";
import { createSessionClient } from "@/services/supabase/server-client";
import { getStudyLog } from "@/services/supabase/study-store";

export const metadata: Metadata = { title: "Kaydı düzenle" };
export const instant = false;

export default function EditStudyLogPage({
  params,
}: PageProps<"/ogrenci/calisma/[logId]">) {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Kayıt yükleniyor..." />}>
      <EditStudyLog params={params} />
    </Suspense>
  );
}

async function EditStudyLog({
  params,
}: Pick<PageProps<"/ogrenci/calisma/[logId]">, "params">) {
  const { logId } = await params;
  if (!z.uuid().safeParse(logId).success) notFound();

  const user = await requireStudent();
  const session = await createSessionClient({ writable: false });
  const log = await getStudyLog(session, user.id, logId);
  if (!log) notFound();

  const today = istanbulToday();
  const catalog = await loadCatalog({ includeArchived: false });
  const subjects = catalog.map((subject) => ({ id: subject.id, name: subject.name }));
  if (!subjects.some((subject) => subject.id === log.subjectId)) {
    subjects.push({ id: log.subjectId, name: `${log.subjectName} (eski sürüm)` });
  }

  const selection = log.outcomeId
    ? { kind: "outcome" as const, id: log.outcomeId }
    : log.topicId
      ? { kind: "topic" as const, id: log.topicId }
      : null;
  const catalogItem = selection ? encodeSelection(selection) : "";
  const described = selection ? describeSelection(catalog, selection) : null;
  const keptSelectionLabel =
    selection && !described && log.topicName
      ? `${log.outcomeCode ? `${log.outcomeCode} · ` : ""}${log.topicName} (eski sürüm)`
      : undefined;

  return (
    <>
      <PageHeader
        title="Kaydı düzenle"
        description="Sayıları düzeltebilir veya kaydı silebilirsin. Silmek geri alınmaz; istersen yeniden yazarsın."
      />
      <div className="grid gap-6">
        <Card>
          <StudyLogForm
            mode="edit"
            logId={log.id}
            catalog={catalog}
            subjects={subjects}
            today={today}
            keptSelectionLabel={keptSelectionLabel}
            defaults={{
              studiedOn: log.studiedOn,
              subjectId: log.subjectId,
              catalogItem,
              questionCount: String(log.questionCount),
              correctCount: String(log.correctCount),
              wrongCount: String(log.wrongCount),
              blankCount: String(log.blankCount),
              durationMinutes: String(log.durationMinutes),
            }}
          />
        </Card>
        <Card title="Kaydı sil">
          <DeleteLogButton logId={log.id} />
        </Card>
      </div>
    </>
  );
}
