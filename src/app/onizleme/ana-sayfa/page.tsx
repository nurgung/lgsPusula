import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { RecommendationCard } from "@/features/coaching/components/recommendation-card";
import { buildCoachingReport } from "@/features/coaching/rules";
import { CharacterHero } from "@/features/home/components/character-hero";
import { EarnedBadges } from "@/features/home/components/earned-badges";
import { SubjectTiles } from "@/features/home/components/subject-tiles";
import { WeekAndExamSummary } from "@/features/home/components/week-and-exam";
import { GrowthNotices } from "@/features/mascot/components/growth-notices";
import { ReminderCard } from "@/features/mascot/components/mascot-panels";
import { evaluateGrowth, type StudyContribution } from "@/features/mascot/growth";
import type { RewardEvent } from "@/features/mascot/rules";
import type { SpeciesCode } from "@/features/mascot/species";
import { addCalendarDays, formatTurkishDate, istanbulToday } from "@/features/study/calendar";

export const metadata: Metadata = { title: "Öğrenci ana sayfası" };

type Sample = {
  id: string;
  title: string;
  species: SpeciesCode | null;
  studyDays: number;
  /** Days without a log before today. A longer gap shows the resting look. */
  gapDays: number;
};

const SAMPLES: readonly Sample[] = [
  { id: "duzenli", title: "Düzenli çalışan öğrenci", species: "cat", studyDays: 9, gapDays: 0 },
  { id: "ara", title: "Birkaç gün ara veren öğrenci", species: "capybara", studyDays: 6, gapDays: 4 },
  { id: "yeni", title: "Karakter seçmemiş öğrenci", species: null, studyDays: 0, gapDays: 0 },
];

function growthFor(sample: Sample, today: string) {
  const logs: StudyContribution[] = Array.from({ length: sample.studyDays }, (_, index) => ({
    studiedOn: addCalendarDays(today, -(sample.gapDays + index)),
    questionCount: 20,
  }));
  return evaluateGrowth({
    today,
    logs,
    rewards: logs.map((log) => ({ points: 5, sourceDate: log.studiedOn })),
  });
}

const SAMPLE_REWARDS: RewardEvent[] = [
  { eventType: "study_log", points: 5, sourceDate: "2026-10-20", ruleVersion: "mascot-v1" },
  { eventType: "exam_saved", points: 5, sourceDate: "2026-10-21", ruleVersion: "mascot-v1" },
];

const SAMPLE_SUBJECTS = [
  { id: "ornek-turkce", name: "Türkçe", weekQuestions: 35 },
  { id: "ornek-matematik", name: "Matematik", weekQuestions: 60 },
  { id: "ornek-fen", name: "Fen Bilimleri", weekQuestions: 0 },
  { id: "ornek-inkilap", name: "T.C. İnkılap Tarihi ve Atatürkçülük", weekQuestions: 12 },
] as const;

export default function HomePreviewPage() {
  const today = istanbulToday();
  const report = buildCoachingReport({
    today,
    logs: [],
    goals: [],
    exams: [],
    mistakes: [],
  });
  const sampleReport = {
    ...report,
    recommendation: {
      ...report.recommendation,
      message: "Matematik dersinde bu kazanım için 3 soru çöz.",
      reason: "Bu öneri, son 90 günde bir kazanıma bağlandığın yanlış ve boş sorulara dayanıyor.",
      evidence: ["Örnek veri: 4 yanlış, 2 boş soru."],
      practice: { outcomeId: "ornek-kazanim", questionCount: 3 },
      href: "/onizleme/ana-sayfa",
      actionLabel: "Kazanımlara bak",
    },
  };
  const week = {
    from: addCalendarDays(today, -3),
    to: today,
    questionCount: 107,
    correctCount: 82,
    wrongCount: 20,
    blankCount: 5,
    durationMinutes: 190,
    bySubject: [],
  };

  return (
    <>
      <div className="grid min-w-0 gap-section">
        <Card variant="quiet" title="Öğrenci ana sayfası (örnek)">
          <p className="text-ink-900">
            Örnek veriyle hazırlanmış görünüm. Gerçek öğrenci kaydı yoktur.
          </p>
        </Card>
        {SAMPLES.map((sample) => (
          <section key={sample.id} className="grid min-w-0 gap-3" aria-label={sample.title}>
            <p className="text-helper font-bold text-ink-700">{sample.title}</p>
            <CharacterHero species={sample.species} growth={growthFor(sample, today)} />
          </section>
        ))}

        <CharacterHero
          species="turtle"
          growth={growthFor(SAMPLES[0]!, today)}
          greeting={{ name: "Deneme", dateLabel: formatTurkishDate(today) }}
        />
        <div className="grid min-w-0 gap-2">
          <GrowthNotices
            notices={[
              {
                id: "ornek-seri",
                title: "Seri durdu",
                body: "Son günlerde seri yapamadın. Devam etmek için bugün bir kayıt ekle.",
              },
            ]}
          />
          <ReminderCard noticeId="ornek-hatirlatma" />
        </div>
        <RecommendationCard report={sampleReport} explanation={null} />
        <WeekAndExamSummary
          summary={week}
          exam={{
            id: "ornek-deneme",
            title: "Örnek deneme",
            takenOn: addCalendarDays(today, -12),
            examType: "lgs_full",
            totalNet: 52.33,
          }}
        />
        <EarnedBadges rewards={SAMPLE_REWARDS} />
        <SubjectTiles subjects={SAMPLE_SUBJECTS} weekLabel="Bu hafta" />
      </div>
    </>
  );
}
