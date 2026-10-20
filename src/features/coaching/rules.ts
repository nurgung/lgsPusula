import { formatNet } from "@/features/exams/net-rules";
import {
  OUTCOME_PRIORITY_RULE_VERSION,
  type OutcomePriority,
  type PrioritisableMistake,
} from "@/features/outcomes/prioritize";
import { outcomeAnalysisWindow } from "@/features/outcomes/window";
import {
  formatTurkishDate,
  formatTurkishDateRange,
  recentListWindow,
  type DateWindow,
} from "@/features/study/calendar";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";
import { COACHING_RULE_VERSION, LOW_ACCURACY_BELOW } from "./constants";
import {
  examChange,
  goalCompletions,
  reviewOutcomes,
  subjectAccuracy,
  type CoachingExamPoint,
  type ExamChange,
  type GoalCompletion,
  type SubjectAccuracy,
} from "./metrics";
import {
  COACHING_MESSAGES,
  examNetDownMessage,
  examNetDownReason,
  goalRemainingMessage,
  goalRemainingReason,
  holdMessage,
  holdReason,
  practiceSubjectMessage,
  practiceSubjectReason,
  repeatOutcomeMessage,
  repeatOutcomeReason,
  suggestGoalMessage,
  suggestGoalReason,
} from "./messages";

export const COACHING_RULES = {
  repeatOutcome: "coaching.repeat-outcome",
  practiceSubject: "coaching.practice-subject",
  examNetDown: "coaching.exam-net-down",
  goalRemaining: "coaching.goal-remaining",
  suggestGoal: "coaching.suggest-goal",
  hold: "coaching.hold",
} as const;

export type CoachingRuleId = (typeof COACHING_RULES)[keyof typeof COACHING_RULES];

export type CoachingRecommendation = {
  ruleId: CoachingRuleId;
  ruleVersion: typeof COACHING_RULE_VERSION;
  message: string;
  /** Shown under "Neden?". Names the data and the rule. */
  reason: string;
  /** Concrete facts: counts, dates, and units. Stored with the recommendation. */
  evidence: readonly string[];
  href: string | null;
  actionLabel: string | null;
};

export type CoachingMetrics = {
  goals: GoalCompletion[];
  subjectAccuracy: SubjectAccuracy[];
  examChange: ExamChange;
  reviewOutcomes: OutcomePriority[];
};

export type CoachingReport = {
  ruleVersion: typeof COACHING_RULE_VERSION;
  today: string;
  practiceWindow: DateWindow;
  examWindow: DateWindow;
  metrics: CoachingMetrics;
  recommendation: CoachingRecommendation;
};

export type CoachingInput = {
  today: string;
  logs: readonly StudyLogView[];
  goals: readonly StudyGoalView[];
  exams: readonly CoachingExamPoint[];
  mistakes: readonly PrioritisableMistake[];
};

function withRule(reason: string, extraRule?: string): string {
  const rules = extraRule
    ? `${extraRule} ve ${COACHING_RULE_VERSION}`
    : COACHING_RULE_VERSION;
  return `${reason} Kural: ${rules}.`;
}

function recommendation(
  ruleId: CoachingRuleId,
  message: string,
  reason: string,
  evidence: readonly string[],
  href: string | null,
  actionLabel: string | null,
): CoachingRecommendation {
  return {
    ruleId,
    ruleVersion: COACHING_RULE_VERSION,
    message,
    reason,
    evidence,
    href,
    actionLabel,
  };
}

function pickPracticeSubject(rows: readonly SubjectAccuracy[]): SubjectAccuracy | null {
  const low = rows.filter(
    (row) =>
      row.sufficient &&
      row.correctShare !== null &&
      row.correctShare < LOW_ACCURACY_BELOW,
  );
  return (
    [...low].sort(
      (a, b) =>
        (a.correctShare ?? 0) - (b.correctShare ?? 0) ||
        b.questionCount - a.questionCount ||
        a.subjectName.localeCompare(b.subjectName, "tr"),
    )[0] ?? null
  );
}

function pickUnmetDaily(goals: readonly GoalCompletion[]): GoalCompletion | null {
  const unmet = goals.filter((goal) => goal.period === "day" && !goal.met);
  return (
    [...unmet].sort(
      (a, b) =>
        b.remainingQuestions - a.remainingQuestions ||
        Number(b.subjectId === null) - Number(a.subjectId === null) ||
        (a.subjectName ?? "").localeCompare(b.subjectName ?? "", "tr"),
    )[0] ?? null
  );
}

function chooseRecommendation(
  metrics: CoachingMetrics,
  today: string,
  practiceWindow: DateWindow,
  examWindow: DateWindow,
): CoachingRecommendation {
  const outcome = metrics.reviewOutcomes[0];
  if (outcome) {
    return recommendation(
      COACHING_RULES.repeatOutcome,
      repeatOutcomeMessage(outcome.outcomeCode),
      withRule(repeatOutcomeReason(), OUTCOME_PRIORITY_RULE_VERSION),
      [
        `${outcome.outcomeCode} · ${outcome.outcomeDescription}`,
        `${outcome.wrongCount} yanlış, ${outcome.blankCount} boş`,
        `Son bağlı deneme: ${formatTurkishDate(outcome.lastTakenOn)}`,
        `Aralık: ${formatTurkishDateRange(examWindow)} · birim: bağlı soru`,
        `Öncelik puanı: ${outcome.score} (yanlış 2, boş 1)`,
      ],
      "/ogrenci/kazanimlar",
      COACHING_MESSAGES.actionOutcome,
    );
  }

  const subject = pickPracticeSubject(metrics.subjectAccuracy);
  if (subject) {
    return recommendation(
      COACHING_RULES.practiceSubject,
      practiceSubjectMessage({
        subjectName: subject.subjectName,
        window: practiceWindow,
        questionCount: subject.questionCount,
        correctCount: subject.correctCount,
      }),
      withRule(practiceSubjectReason()),
      [
        `${subject.subjectName}: ${subject.correctCount} doğru / ${subject.questionCount} soru`,
        `Aralık: ${formatTurkishDateRange(practiceWindow)} · birim: soru`,
        "10 sorudan az kayıtta oran yok. Doğru sayısı soru sayısının yarısından az olan ders seçilir.",
      ],
      "/ogrenci/calisma/yeni",
      COACHING_MESSAGES.actionPractice,
    );
  }

  const change = metrics.examChange;
  if (change.sufficient && change.delta < 0) {
    return recommendation(
      COACHING_RULES.examNetDown,
      examNetDownMessage({
        earlierNet: change.earlier.totalNet,
        laterNet: change.later.totalNet,
        earlierOn: change.earlier.takenOn,
        laterOn: change.later.takenOn,
      }),
      withRule(examNetDownReason()),
      [
        `${change.earlier.title}: ${formatTurkishDate(change.earlier.takenOn)} · toplam net ${formatNet(change.earlier.totalNet)}`,
        `${change.later.title}: ${formatTurkishDate(change.later.takenOn)} · toplam net ${formatNet(change.later.totalNet)}`,
        `Fark: ${formatNet(change.delta)} net (son − önceki)`,
        `Aralık: ${formatTurkishDateRange({ from: change.earlier.takenOn, to: change.later.takenOn })} · birim: net`,
        "Karşılaştırılan tür: tam LGS",
      ],
      "/ogrenci/denemeler/gelisim",
      COACHING_MESSAGES.actionExam,
    );
  }

  const daily = pickUnmetDaily(metrics.goals);
  if (daily) {
    const scope = daily.subjectName ?? "tüm dersler";
    return recommendation(
      COACHING_RULES.goalRemaining,
      goalRemainingMessage({
        target: daily.targetQuestions,
        done: daily.doneQuestions,
        remaining: daily.remainingQuestions,
        scope,
      }),
      withRule(goalRemainingReason(today)),
      [
        `Tarih: ${formatTurkishDate(today)} · Europe/Istanbul`,
        `${scope}: ${daily.doneQuestions} / ${daily.targetQuestions} soru`,
        `Kalan: ${daily.remainingQuestions} soru`,
      ],
      "/ogrenci/calisma/yeni",
      COACHING_MESSAGES.actionGoal,
    );
  }

  const hasDailyGoal = metrics.goals.some((goal) => goal.period === "day");
  if (!hasDailyGoal) {
    return recommendation(
      COACHING_RULES.suggestGoal,
      suggestGoalMessage(),
      withRule(suggestGoalReason(today)),
      [
        `Tarih: ${formatTurkishDate(today)} · Europe/Istanbul`,
        "Günlük hedef satırı yok. Haftalık hedef bu kartta kullanılmaz.",
        "Bu metin bir akademik sonuç değildir.",
      ],
      "/ogrenci/hedefler",
      COACHING_MESSAGES.actionSuggestGoal,
    );
  }

  return recommendation(
    COACHING_RULES.hold,
    holdMessage(),
    withRule(holdReason()),
    holdEvidence(metrics),
    null,
    null,
  );
}

function holdEvidence(metrics: CoachingMetrics): string[] {
  const lines = [
    "Bağlı kazanım yok. Yanlış sayısından kazanım adı üretilmez.",
    "Bugünkü hedef tamam.",
  ];
  if (!metrics.examChange.sufficient) {
    lines.push(
      `Tam LGS denemesi: ${metrics.examChange.fullExamCount}. Karşılaştırma için en az 2 deneme gerekir.`,
    );
  } else if (metrics.examChange.delta >= 0) {
    lines.push("Son iki tam LGS denemesinde toplam net azalmadı.");
  }
  if (metrics.subjectAccuracy.some((row) => !row.sufficient)) {
    lines.push("10 sorudan az kaydı olan dersler için doğru oranı gösterilmez.");
  }
  if (
    metrics.subjectAccuracy.some(
      (row) => row.sufficient && (row.correctShare ?? 0) >= LOW_ACCURACY_BELOW,
    )
  ) {
    lines.push(
      "Yeterli kaydı olan derslerde doğru sayısı, soru sayısının yarısından az değil.",
    );
  }
  return lines;
}

/**
 * Builds one recommendation from the caller's rows.
 * Logs outside the 14-day practice window, and exams or mistakes outside the 90-day
 * window, are ignored. The reason and evidence stay on the result; nothing is written.
 */
export function buildCoachingReport(input: CoachingInput): CoachingReport {
  const practiceWindow = recentListWindow(input.today);
  const examWindow = outcomeAnalysisWindow(input.today);
  const logs = input.logs.filter(
    (log) => log.studiedOn >= practiceWindow.from && log.studiedOn <= practiceWindow.to,
  );
  const exams = input.exams.filter(
    (exam) => exam.takenOn >= examWindow.from && exam.takenOn <= examWindow.to,
  );
  const metrics: CoachingMetrics = {
    goals: goalCompletions(input.goals, logs, input.today),
    subjectAccuracy: subjectAccuracy(logs, practiceWindow),
    examChange: examChange(exams),
    reviewOutcomes: reviewOutcomes(input.mistakes, examWindow),
  };
  return {
    ruleVersion: COACHING_RULE_VERSION,
    today: input.today,
    practiceWindow,
    examWindow,
    metrics,
    recommendation: chooseRecommendation(
      metrics,
      input.today,
      practiceWindow,
      examWindow,
    ),
  };
}
