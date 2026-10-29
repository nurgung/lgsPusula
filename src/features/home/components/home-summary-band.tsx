import type { ExamAnalysis } from "@/features/exams/analysis";
import type { RewardEvent } from "@/features/mascot/rules";
import type { PeriodSummary } from "@/features/study/summary";
import { EarnedBadges } from "./earned-badges";
import { ExamAnalysisCard } from "./exam-analysis-card";
import { LatestExam, WeekSummary } from "./week-and-exam";

/**
 * Summary band of the student home: Deneme Analizi, Bu hafta, Son deneme, Rozetler.
 *
 * - `xl` (1280 px+): two columns, about 2 : 1. Left: the analysis. Right: week, latest
 *   exam and badges. The column wrappers are real grids only from here.
 * - `lg` (1024–1279 px): the wrappers dissolve (`contents`). The analysis is full width,
 *   week and latest exam sit side by side, badges are full width.
 * - Below `lg`: one column in the same reading order. No desktop grid is forced.
 */
export function HomeSummaryBand({
  week,
  analysis,
  rewards,
}: {
  week: PeriodSummary;
  analysis: ExamAnalysis;
  rewards: readonly RewardEvent[];
}) {
  const latest = analysis.latest;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start">
      <div className="contents xl:block xl:min-w-0">
        <ExamAnalysisCard analysis={analysis} className="lg:col-span-2 xl:col-span-1" />
      </div>
      <div className="contents xl:grid xl:min-w-0 xl:content-start xl:gap-4">
        <WeekSummary
          summary={week}
          className={latest ? undefined : "lg:col-span-2 xl:col-span-1"}
        />
        <LatestExam
          exam={
            latest
              ? {
                  id: latest.id,
                  title: latest.title,
                  takenOn: latest.takenOn,
                  examType: latest.examType,
                }
              : null
          }
        />
        <EarnedBadges rewards={rewards} className="lg:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}
