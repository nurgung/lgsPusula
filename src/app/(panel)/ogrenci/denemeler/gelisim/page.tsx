import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { NetTrendChart } from "@/features/outcomes/components/net-trend-chart";
import { loadNetTrend } from "@/features/outcomes/load-analysis";
import { outcomeAnalysisWindow } from "@/features/outcomes/window";
import { istanbulToday } from "@/features/study/calendar";

export const metadata: Metadata = { title: "Net değişimi" };
export const instant = false;

export default function ExamTrendPage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Grafik yükleniyor..." />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireStudent();
  const window = outcomeAnalysisWindow(istanbulToday());
  const trend = await loadNetTrend(user.id, window);

  return (
    <>
      <PageHeader
        title="Net değişimi"
        description="Denemeler arasındaki toplam net. Grafiğin altında aynı verinin tablosu vardır."
      />
      <Card className="mb-4">
        <NetTrendChart
          points={trend.points}
          window={window}
          showChart={trend.showChart}
        />
      </Card>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/ogrenci/denemeler" variant="secondary">
          Denemelere dön
        </ButtonLink>
        <ButtonLink href="/ogrenci/kazanimlar" variant="secondary">
          Kazanım öncelikleri
        </ButtonLink>
      </div>
    </>
  );
}
