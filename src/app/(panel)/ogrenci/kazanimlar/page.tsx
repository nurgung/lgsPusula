import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StateMessage } from "@/components/ui/state-message";
import { requireStudent } from "@/features/access/guards";
import { OutcomePriorityList } from "@/features/outcomes/components/outcome-priority-list";
import { loadOutcomePriorities } from "@/features/outcomes/load-analysis";
import { OUTCOME_PRIORITY_RULE_VERSION } from "@/features/outcomes/prioritize";
import { outcomeAnalysisWindow } from "@/features/outcomes/window";
import { istanbulToday } from "@/features/study/calendar";

export const metadata: Metadata = { title: "Kazanım öncelikleri" };
export const instant = false;

export default function OutcomesPage() {
  return (
    <Suspense
      fallback={<StateMessage variant="loading" title="Öncelikler yükleniyor..." />}
    >
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireStudent();
  const window = outcomeAnalysisWindow(istanbulToday());
  const items = await loadOutcomePriorities(user.id, window);

  return (
    <>
      <PageHeader
        title="Kazanım öncelikleri"
        description={`Yanlış ve boş sorulara bağladığın kazanımlar. Kural ${OUTCOME_PRIORITY_RULE_VERSION}: yanlış 2 puan, boş 1 puan. Bağlanmamış sorular listede yer almaz.`}
      />
      <Card className="mb-4">
        <OutcomePriorityList items={items} window={window} />
      </Card>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/ogrenci/denemeler" variant="secondary">
          Denemelere git
        </ButtonLink>
        <ButtonLink href="/ogrenci/denemeler/gelisim" variant="secondary">
          Net değişimi
        </ButtonLink>
      </div>
    </>
  );
}
