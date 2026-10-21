/**
 * mascot-v1. The database function `sync_mascot_rewards_for` inserts these point
 * values. This file is the explanation the app shows; it does not grant points.
 * A missed day never removes a row, so the stage cannot move backwards.
 */

export const MASCOT_RULE_VERSION = "mascot-v1" as const;

export const REWARD_POINTS = {
  study_log: 5,
  daily_goal: 10,
  exam_saved: 5,
  outcome_review: 8,
} as const;

export type RewardEventType = keyof typeof REWARD_POINTS;

/** Inclusive minimum total. The highest matching row is the current stage. */
export const STAGE_LEVELS = [
  { id: "new", minPoints: 0, name: "Yeni arkadaş" },
  { id: "settling", minPoints: 10, name: "Alışıyor" },
  { id: "growing", minPoints: 30, name: "Birlikte büyüyor" },
  { id: "companion", minPoints: 60, name: "Yol arkadaşı" },
] as const;

export type StageId = (typeof STAGE_LEVELS)[number]["id"];

/** Distinct Istanbul days with a study-log reward. A gap does not reset the count. */
export const STEADY_DAY_BADGE_COUNT = 3;

export const DEFAULT_QUIET_START = "21:00";
export const DEFAULT_QUIET_END = "08:00";
export const DEFAULT_MAX_PER_DAY = 1;

export const MAX_REMINDERS_PER_DAY = 3;
