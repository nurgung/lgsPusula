import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { RecommendationCard } from "@/features/coaching/components/recommendation-card";
import type { CoachingReport } from "@/features/coaching/rules";
import type { ExamAnalysis } from "@/features/exams/analysis";
import { CreateInviteForm } from "@/features/family/components/create-invite-form";
import { RespondLinkForms } from "@/features/family/components/respond-link-forms";
import { RevokeLinkButton } from "@/features/family/components/revoke-link-button";
import { GrowthNotices } from "@/features/mascot/components/growth-notices";
import { ReminderCard } from "@/features/mascot/components/mascot-panels";
import type { GrowthView } from "@/features/mascot/growth";
import type { RewardEvent, TaskFacts } from "@/features/mascot/rules";
import type { SpeciesCode } from "@/features/mascot/species";
import { STUDENT_DATA_NOTICE } from "@/features/privacy/notice";
import { formatTurkishDate } from "@/features/study/calendar";
import type {
  PeriodSummary,
  StudyGoalView,
  StudyLogView,
} from "@/features/study/summary";
import { CharacterHero } from "./character-hero";
import { HomeGoals } from "./home-goals";
import { HomeSummaryBand } from "./home-summary-band";
import { SubjectTiles, type SubjectTileModel } from "./subject-tiles";

export type StudentHomeLink = { id: string; parentName: string };

export type StudentHomeViewProps = {
  displayName: string;
  today: string;
  species: SpeciesCode | null;
  growth: GrowthView;
  notices: readonly { id: string; title: string; body: string }[];
  reminderId: string | null;
  report: CoachingReport;
  explanation: string | null;
  taskFacts: TaskFacts;
  goals: readonly StudyGoalView[];
  logs: readonly StudyLogView[];
  subjectTiles: readonly SubjectTileModel[];
  weekLabel: string;
  week: PeriodSummary;
  analysis: ExamAnalysis;
  rewards: readonly RewardEvent[];
  activeLink: StudentHomeLink | null;
  pendingLink: StudentHomeLink | null;
};

/**
 * Layout of `/ogrenci`, kept apart from data loading so the real page and the sample
 * page `/onizleme/ogrenci` render the exact same composition. It only receives values;
 * it never reads a record and never calculates a score, goal or net.
 */
export function StudentHomeView({
  displayName,
  today,
  species,
  growth,
  notices,
  reminderId,
  report,
  explanation,
  taskFacts,
  goals,
  logs,
  subjectTiles,
  weekLabel,
  week,
  analysis,
  rewards,
  activeLink,
  pendingLink,
}: StudentHomeViewProps) {
  return (
    <>
      {/*
        Phase 2–3: character band first; compact notices; coach card with clear action hierarchy.
        From lg, goals and tiles sit side by side. The canvas stays neutral.
      */}
      <div data-wide-page className="grid min-w-0 gap-section">
        <CharacterHero
          species={species}
          growth={growth}
          greeting={{ name: displayName, dateLabel: formatTurkishDate(today) }}
        />
        {notices.length > 0 || reminderId ? (
          <div className="grid min-w-0 gap-2">
            {notices.length > 0 ? <GrowthNotices notices={notices} /> : null}
            {reminderId ? <ReminderCard noticeId={reminderId} /> : null}
          </div>
        ) : null}
        <RecommendationCard report={report} explanation={explanation} />
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
          <HomeGoals facts={taskFacts} goals={goals} logs={logs} today={today} />
          <SubjectTiles subjects={subjectTiles} weekLabel={weekLabel} />
        </div>
        <div className="grid min-w-0 gap-4" role="region" aria-labelledby="alt-ozet">
          <h2 id="alt-ozet" className="text-lg font-bold text-ink-900">
            Özet
          </h2>
          <HomeSummaryBand week={week} analysis={analysis} rewards={rewards} />
          <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
            <Card variant="quiet" title={STUDENT_DATA_NOTICE.title}>
              <ul className="grid list-disc gap-1 pl-5 text-ink-900">
                {STUDENT_DATA_NOTICE.kept.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 text-ink-900">{STUDENT_DATA_NOTICE.notKept}</p>
              <p className="mt-3 text-ink-900">{STUDENT_DATA_NOTICE.parent}</p>
              <p className="mt-3 text-ink-900">{STUDENT_DATA_NOTICE.device}</p>
              <p className="mt-3 text-ink-900">{STUDENT_DATA_NOTICE.ai}</p>
            </Card>

            {activeLink ? (
              <Card
                title="Bağlı velin"
                description="Çalışmalarını görebilir, değiştiremez."
              >
                <div className="grid gap-4">
                  <p className="font-semibold text-ink-900">{activeLink.parentName}</p>
                  <RevokeLinkButton
                    linkId={activeLink.id}
                    description="Kaldırınca velin çalışmalarını göremez. İstersen sonra yeni bir kodla yine bağlanabilirsiniz."
                  />
                </div>
              </Card>
            ) : null}

            {pendingLink ? (
              <Card
                title="Bağlantı isteği"
                description={`${pendingLink.parentName} velin olarak bağlanmak istiyor.`}
              >
                <RespondLinkForms linkId={pendingLink.id} />
              </Card>
            ) : null}

            {!activeLink && !pendingLink ? (
              <Card title="Veli bağlantısı">
                <div className="grid gap-4">
                  <StateMessage
                    variant="empty"
                    title="Henüz bir velin bağlı değil."
                    description="Kod üret, veline söyle. Veli kodu girince isteği burada görürsün. Onaylamadan bağlantı kurulmaz."
                  />
                  <CreateInviteForm />
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
