import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import {
  formatTurkishDateRange,
  istanbulToday,
  recentListWindow,
  type DateWindow,
} from "@/features/study/calendar";
import { ComparisonPanel } from "@/features/study/components/comparison-panel";
import { StudyLogList } from "@/features/study/components/study-log-list";
import { STUDY_MESSAGES } from "@/features/study/messages";
import { loadStudyRecords } from "@/features/study/load-study";
import { parseComparisonQuery } from "@/features/study/summary";

export const metadata: Metadata = { title: "Çalışma" };
export const instant = false;

const LOG_STATUS: Record<string, string> = {
  kaydedildi: STUDY_MESSAGES.saved,
  guncellendi: STUDY_MESSAGES.updated,
  silindi: STUDY_MESSAGES.deleted,
};

export default function StudyPage({ searchParams }: PageProps<"/ogrenci/calisma">) {
  return (
    <Suspense
      fallback={<StateMessage variant="loading" title="Çalışmaların yükleniyor..." />}
    >
      <StudyContent searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function covering(windows: DateWindow[]): DateWindow {
  return {
    from: windows.reduce(
      (min, window) => (window.from < min ? window.from : min),
      windows[0]!.from,
    ),
    to: windows.reduce(
      (max, window) => (window.to > max ? window.to : max),
      windows[0]!.to,
    ),
  };
}

async function StudyContent({
  searchParams,
}: Pick<PageProps<"/ogrenci/calisma">, "searchParams">) {
  const user = await requireStudent();
  const params = await searchParams;
  const today = istanbulToday();
  const listWindow = recentListWindow(today);
  const comparison = parseComparisonQuery(
    {
      from1: one(params.from1),
      to1: one(params.to1),
      from2: one(params.from2),
      to2: one(params.to2),
    },
    today,
  );
  const fetchWindow = comparison.ok
    ? covering([listWindow, comparison.first, comparison.second])
    : listWindow;
  const { logs } = await loadStudyRecords(user.id, fetchWindow);
  const listed = logs.filter(
    (log) => log.studiedOn >= listWindow.from && log.studiedOn <= listWindow.to,
  );
  const durum = one(params.durum);
  const status = LOG_STATUS[durum];

  return (
    <>
      <PageHeader
        title="Çalışma kayıtların"
        description={`${formatTurkishDateRange(listWindow)} arasındaki kayıtlar. Birim: soru ve dakika.`}
      />
      <div className="grid gap-6">
        {status ? <StateMessage variant="success" title={status} /> : null}
        <div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/ogrenci/calisma/yeni">Yeni kayıt</ButtonLink>
            <ButtonLink href="/ogrenci/ice-aktar" variant="secondary">
              Dosyadan aktar
            </ButtonLink>
          </div>
        </div>
        <StudyLogList logs={listed} editable />
        <Card
          title="Geçmişle karşılaştır"
          description="İki tarih aralığındaki soru sayısı ve süreyi yan yana görürsün. Varsayılan, bu haftanın bugüne kadarki günleri ile geçen haftadır."
        >
          <ComparisonPanel
            logs={logs}
            today={today}
            query={{
              from1: params.from1,
              to1: params.to1,
              from2: params.from2,
              to2: params.to2,
            }}
          />
        </Card>
      </div>
    </>
  );
}
