import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/state-message";
import { RecommendationCard } from "@/features/coaching/components/recommendation-card";
import { buildCoachingReport } from "@/features/coaching/rules";
import { buildExamAnalysis, type AnalysisExam } from "@/features/exams/analysis";
import { CharacterHero } from "@/features/home/components/character-hero";
import { SubjectTiles } from "@/features/home/components/subject-tiles";
import { HomeSummaryBand } from "@/features/home/components/home-summary-band";
import { GrowthNotices } from "@/features/mascot/components/growth-notices";
import { ReminderCard } from "@/features/mascot/components/mascot-panels";
import { evaluateGrowth, type StudyContribution } from "@/features/mascot/growth";
import type { RewardEvent } from "@/features/mascot/rules";
import type { SpeciesCode } from "@/features/mascot/species";
import {
  addCalendarDays,
  formatTurkishDate,
  istanbulToday,
} from "@/features/study/calendar";

export const metadata: Metadata = { title: "Öğrenci ana sayfası" };
// Today's date is read per request (`connection()` inside Suspense).
export const instant = false;

type Sample = {
  id: string;
  title: string;
  species: SpeciesCode | null;
  studyDays: number;
  /** Days without a log before today. A longer gap shows the resting look. */
  gapDays: number;
};

const SAMPLES: readonly Sample[] = [
  {
    id: "duzenli",
    title: "Düzenli çalışan öğrenci",
    species: "cat",
    studyDays: 9,
    gapDays: 0,
  },
  {
    id: "ara",
    title: "Birkaç gün ara veren öğrenci",
    species: "capybara",
    studyDays: 6,
    gapDays: 4,
  },
  {
    id: "yeni",
    title: "Karakter seçmemiş öğrenci",
    species: null,
    studyDays: 0,
    gapDays: 0,
  },
];

function growthFor(sample: Sample, today: string) {
  const logs: StudyContribution[] = Array.from(
    { length: sample.studyDays },
    (_, index) => ({
      studiedOn: addCalendarDays(today, -(sample.gapDays + index)),
      questionCount: 20,
    }),
  );
  return evaluateGrowth({
    today,
    logs,
    rewards: logs.map((log) => ({ points: 5, sourceDate: log.studiedOn })),
  });
}

const SAMPLE_REWARDS: RewardEvent[] = [
  {
    eventType: "study_log",
    points: 5,
    sourceDate: "2026-10-20",
    ruleVersion: "mascot-v1",
  },
  {
    eventType: "exam_saved",
    points: 5,
    sourceDate: "2026-10-21",
    ruleVersion: "mascot-v1",
  },
];

const SAMPLE_SUBJECTS = [
  { id: "ornek-turkce", name: "Türkçe", weekQuestions: 35 },
  { id: "ornek-matematik", name: "Matematik", weekQuestions: 60 },
  { id: "ornek-fen", name: "Fen Bilimleri", weekQuestions: 0 },
  { id: "ornek-inkilap", name: "T.C. İnkılap Tarihi ve Atatürkçülük", weekQuestions: 12 },
] as const;

/** Fictional exams for the preview only. Newest first, like the real list. */
function sampleExams(today: string): AnalysisExam[] {
  const base = { examType: "lgs_full" } as const;
  return [
    {
      ...base,
      id: "ornek-5",
      title: "Örnek deneme 5",
      takenOn: addCalendarDays(today, -2),
      totalNet: 61.67,
      score: 438.2,
    },
    {
      ...base,
      id: "ornek-4",
      title: "Örnek deneme 4",
      takenOn: addCalendarDays(today, -9),
      totalNet: 55.33,
      score: 421.75,
    },
    {
      ...base,
      id: "ornek-3",
      title: "Örnek deneme 3",
      takenOn: addCalendarDays(today, -16),
      totalNet: 57,
      score: 426,
    },
    {
      ...base,
      id: "ornek-2",
      title: "Örnek deneme 2",
      takenOn: addCalendarDays(today, -23),
      totalNet: 48.5,
      score: 401.5,
    },
    {
      ...base,
      id: "ornek-1",
      title: "Örnek deneme 1",
      takenOn: addCalendarDays(today, -30),
      totalNet: 44.25,
      score: 389,
    },
  ];
}

export default function HomePreviewPage() {
  return (
    <Suspense fallback={<StateMessage variant="loading" title="Sayfa yükleniyor..." />}>
      <HomePreview />
    </Suspense>
  );
}

async function HomePreview() {
  await connection();
  const today = istanbulToday();
  const report = buildCoachingReport({
    today,
    logs: [],
    goals: [],
    exams: [],
    mistakes: [
      {
        outcomeId: "11111111-1111-4111-8111-111111111111",
        outcomeCode: "M.8.1.1",
        outcomeDescription: "Tam sayılarla işlemler yapar.",
        subjectId: "ornek-matematik",
        subjectName: "Matematik",
        kind: "wrong",
        takenOn: addCalendarDays(today, -5),
      },
      {
        outcomeId: "11111111-1111-4111-8111-111111111111",
        outcomeCode: "M.8.1.1",
        outcomeDescription: "Tam sayılarla işlemler yapar.",
        subjectId: "ornek-matematik",
        subjectName: "Matematik",
        kind: "wrong",
        takenOn: addCalendarDays(today, -5),
      },
      {
        outcomeId: "11111111-1111-4111-8111-111111111111",
        outcomeCode: "M.8.1.1",
        outcomeDescription: "Tam sayılarla işlemler yapar.",
        subjectId: "ornek-matematik",
        subjectName: "Matematik",
        kind: "blank",
        takenOn: addCalendarDays(today, -12),
      },
    ],
  });
  const sampleReport = {
    ...report,
    recommendation: {
      ...report.recommendation,
      href: "/onizleme/ana-sayfa",
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
      <div data-wide-page className="grid min-w-0 gap-section">
        <Card variant="quiet" title="Öğrenci ana sayfası (örnek)">
          <p className="text-ink-900">
            Örnek veriyle hazırlanmış görünüm. Gerçek öğrenci kaydı yoktur.
          </p>
        </Card>
        {SAMPLES.map((sample) => (
          <section
            key={sample.id}
            className="grid min-w-0 gap-3"
            aria-label={sample.title}
          >
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
        <SubjectTiles subjects={SAMPLE_SUBJECTS} weekLabel="Bu hafta" />
        <section className="grid min-w-0 gap-4" aria-labelledby="ornek-ozet">
          <h2 id="ornek-ozet" className="text-lg font-bold text-ink-900">
            Özet (örnek denemelerle)
          </h2>
          <HomeSummaryBand
            week={week}
            analysis={buildExamAnalysis(sampleExams(today))}
            rewards={SAMPLE_REWARDS}
          />
        </section>
        <section className="grid min-w-0 gap-4" aria-labelledby="ornek-tek">
          <h2 id="ornek-tek" className="text-lg font-bold text-ink-900">
            Özet: tek deneme (örnek)
          </h2>
          <HomeSummaryBand
            week={week}
            analysis={buildExamAnalysis(sampleExams(today).slice(-1))}
            rewards={[]}
          />
        </section>
        <section className="grid min-w-0 gap-4" aria-labelledby="ornek-puansiz">
          <h2 id="ornek-puansiz" className="text-lg font-bold text-ink-900">
            Özet: son denemede puan yok (örnek)
          </h2>
          <HomeSummaryBand
            week={week}
            analysis={buildExamAnalysis(
              sampleExams(today).map((exam, index) =>
                index === 0 ? { ...exam, score: null } : exam,
              ),
            )}
            rewards={SAMPLE_REWARDS}
          />
        </section>
        <section className="grid min-w-0 gap-4" aria-labelledby="ornek-bos">
          <h2 id="ornek-bos" className="text-lg font-bold text-ink-900">
            Özet: deneme yok (örnek)
          </h2>
          <HomeSummaryBand
            week={{ ...week, questionCount: 0, correctCount: 0, durationMinutes: 0 }}
            analysis={buildExamAnalysis([])}
            rewards={[]}
          />
        </section>
      </div>
    </>
  );
}
