import {
  MASCOT_RULE_VERSION,
  REWARD_POINTS,
  STAGE_LEVELS,
  STEADY_DAY_BADGE_COUNT,
  type RewardEventType,
  type StageId,
} from "./constants";
import { MASCOT_MESSAGES } from "./messages";

export type RewardEvent = {
  eventType: RewardEventType;
  points: number;
  sourceDate: string | null;
  ruleVersion: string;
};

export type StageView = {
  id: StageId;
  name: string;
  points: number;
  /** Null at the last stage. The meter then stops instead of asking for more. */
  nextName: string | null;
  nextAt: number | null;
};

export type BadgeView = {
  id: "first_step" | "goal_met" | "steady_days" | "reviewer" | "exam_noted";
  name: string;
  description: string;
  earned: boolean;
};

export type TaskView = {
  id: "log_today" | "meet_goal" | "review_outcome";
  title: string;
  done: boolean;
  href: string;
};

export type TaskFacts = {
  todayLogCount: number;
  todayQuestionCount: number;
  /** All-subjects daily goal. A subject-only goal does not award the daily-goal points. */
  dailyGoalTarget: number | null;
  /** An exam that still has an unlinked wrong or blank answer. No score is included. */
  reviewExamId: string | null;
};

const BADGE_COPY: Record<BadgeView["id"], { name: string; description: string }> = {
  first_step: {
    name: "İlk kayıt",
    description: "Bir çalışma kaydı eklediğinde durur. Silmek bunu geri almaz.",
  },
  goal_met: {
    name: "Hedefe ulaştın",
    description: "Tüm dersler için seçtiğin günlük soru hedefini bir kez tamamladığında durur.",
  },
  steady_days: {
    name: "Üç farklı gün",
    description: "Üç ayrı günde kayıt yeterli. Arada boş bir gün bunu silmez.",
  },
  reviewer: {
    name: "Kazanıma baktın",
    description: "Bir denemedeki soruyu kazanımla eşleştirdiğinde durur.",
  },
  exam_noted: {
    name: "Deneme kaydı",
    description: "Bir deneme kaydettiğinde durur. Rozet, sonuçtaki sayıya bakmaz.",
  },
};

export function stageForPoints(points: number): StageView {
  const safe = Math.max(0, Math.floor(points));
  let current: (typeof STAGE_LEVELS)[number] = STAGE_LEVELS[0];
  for (const level of STAGE_LEVELS) {
    if (safe >= level.minPoints) current = level;
  }
  const next = STAGE_LEVELS.find((level) => level.minPoints > current.minPoints) ?? null;
  return {
    id: current.id,
    name: current.name,
    points: safe,
    nextName: next?.name ?? null,
    nextAt: next?.minPoints ?? null,
  };
}

/**
 * Points only ever add. Dropping a day from the calendar, or deleting the source row,
 * leaves the existing events in place, so the stage stays.
 */
export function pointsAfterMissedDay(events: readonly RewardEvent[]): number {
  return totalPoints(events);
}

export function totalPoints(events: readonly RewardEvent[]): number {
  return events.reduce((sum, event) => sum + (event.points > 0 ? event.points : 0), 0);
}

export function badgesFor(events: readonly RewardEvent[]): BadgeView[] {
  const studyDays = new Set(
    events
      .filter((event) => event.eventType === "study_log" && event.sourceDate)
      .map((event) => event.sourceDate),
  );
  const earned: Record<BadgeView["id"], boolean> = {
    first_step: events.some((event) => event.eventType === "study_log"),
    goal_met: events.some((event) => event.eventType === "daily_goal"),
    steady_days: studyDays.size >= STEADY_DAY_BADGE_COUNT,
    reviewer: events.some((event) => event.eventType === "outcome_review"),
    exam_noted: events.some((event) => event.eventType === "exam_saved"),
  };
  return (Object.keys(BADGE_COPY) as BadgeView["id"][]).map((id) => ({
    id,
    name: BADGE_COPY[id].name,
    description: BADGE_COPY[id].description,
    earned: earned[id],
  }));
}

export function tasksFor(facts: TaskFacts): TaskView[] {
  const tasks: TaskView[] = [
    {
      id: "log_today",
      title: MASCOT_MESSAGES.taskLog,
      done: facts.todayLogCount > 0,
      href: "/ogrenci/calisma/yeni",
    },
  ];
  if (facts.dailyGoalTarget != null) {
    tasks.push({
      id: "meet_goal",
      title: MASCOT_MESSAGES.taskGoal,
      done: facts.todayQuestionCount >= facts.dailyGoalTarget,
      href: "/ogrenci/calisma/yeni",
    });
  }
  if (facts.reviewExamId) {
    tasks.push({
      id: "review_outcome",
      title: MASCOT_MESSAGES.taskReview,
      done: false,
      href: `/ogrenci/denemeler/${facts.reviewExamId}/kazanimlar`,
    });
  }
  return tasks;
}

/** Same key twice is one event. The database unique pair is the real guard. */
export function planRewardKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>();
  const planned: string[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    planned.push(key);
  }
  return planned;
}

export function pointsForEvent(eventType: RewardEventType): number {
  return REWARD_POINTS[eventType];
}

export function rewardRuleVersion(): typeof MASCOT_RULE_VERSION {
  return MASCOT_RULE_VERSION;
}
