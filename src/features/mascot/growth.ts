import {
  addCalendarDays,
  isRealIsoDate,
  STUDY_DATE_MIN,
} from "@/features/study/calendar";
import { STAGE_LEVELS, type StageId } from "./constants";
import { MASCOT_MESSAGES, stageEarnedNotice } from "./messages";

/**
 * growth-v1. The visible stage is not the mascot-v1 point total.
 * Points stay in reward_events. This rule only decides what the student sees.
 * A calendar day can raise the stage by one step. A later empty day does not
 * lower it. Deleting or editing a log changes the replay, because the stage is
 * derived from the rows that still exist.
 */

export const GROWTH_RULE_VERSION = "growth-v1" as const;

export type HealthStatus = "healthy" | "tired" | "sick" | "recovering";

export type StudyContribution = {
  studiedOn: string;
  questionCount: number;
};

export type DatedPoints = {
  points: number;
  sourceDate: string | null;
};

export type GrowthFacts = {
  /** Europe/Istanbul civil date. The unfinished day is not a missed day. */
  today: string;
  logs: readonly StudyContribution[];
  rewards: readonly DatedPoints[];
};

export type GrowthNoticeKind =
  "streak_broken" | "mascot_sick" | "mascot_recovering" | "stage_earned";

export type GrowthNoticePlan = {
  kind: GrowthNoticeKind;
  noticeDate: string;
};

export type GrowthRequirementId = "streak" | "studyDays" | "questions" | "points";

export type GrowthRequirement = {
  id: GrowthRequirementId;
  met: boolean;
  current: number;
  target: number;
  unit: string;
  /** Shown when this condition is still open. */
  gap: string;
};

export type GrowthView = {
  ruleVersion: typeof GROWTH_RULE_VERSION;
  today: string;
  stageId: StageId;
  stageName: string;
  stageEarnedOn: string | null;
  nextStageId: StageId | null;
  nextStageName: string | null;
  /** mascot-v1 points dated today or earlier. The point table is unchanged. */
  points: number;
  currentStreak: number;
  longestStreak: number;
  studyDays: number;
  questions: number;
  studiedToday: boolean;
  health: HealthStatus;
  requirements: GrowthRequirement[];
  nextStep: string;
  notices: GrowthNoticePlan[];
};

const CONTINUITY = {
  settling: { streak: 7, studyDays: 5, questions: 0 },
  growing: { streak: 14, studyDays: 10, questions: 300 },
  companion: { streak: 30, studyDays: 20, questions: 750 },
} as const;

const STAGE_ORDER = STAGE_LEVELS.map((level) => level.id);

type DayStats = {
  streak: number;
  studyDays: number;
  questions: number;
  points: number;
};

type ReplayInput = {
  totals: Map<string, number>;
  days: readonly string[];
  rewards: readonly DatedPoints[];
};

function stageName(id: StageId): string {
  return STAGE_LEVELS.find((level) => level.id === id)?.name ?? "Yeni arkadaş";
}

function minPoints(id: StageId): number {
  return STAGE_LEVELS.find((level) => level.id === id)?.minPoints ?? 0;
}

function isCountedDay(value: string, today: string): boolean {
  return isRealIsoDate(value) && value >= STUDY_DATE_MIN && value <= today;
}

function dayQuestions(
  logs: readonly StudyContribution[],
  today: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const log of logs) {
    if (!isCountedDay(log.studiedOn, today)) continue;
    if (!Number.isInteger(log.questionCount) || log.questionCount < 1) continue;
    totals.set(log.studiedOn, (totals.get(log.studiedOn) ?? 0) + log.questionCount);
  }
  return totals;
}

function sortedDays(totals: Map<string, number>): string[] {
  return [...totals.keys()].sort();
}

function pointsOnOrBefore(rewards: readonly DatedPoints[], day: string): number {
  let sum = 0;
  for (const reward of rewards) {
    if (!Number.isInteger(reward.points) || reward.points <= 0) continue;
    if (reward.sourceDate == null) {
      sum += reward.points;
      continue;
    }
    if (!isRealIsoDate(reward.sourceDate) || reward.sourceDate > day) continue;
    sum += reward.points;
  }
  return sum;
}

function consecutiveEnding(days: ReadonlySet<string>, anchor: string): number {
  let count = 0;
  let cursor = anchor;
  while (days.has(cursor)) {
    count += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return count;
}

function longestRun(days: readonly string[]): number {
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous != null && addCalendarDays(previous, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
}

function currentStreak(days: ReadonlySet<string>, today: string): number {
  if (days.has(today)) return consecutiveEnding(days, today);
  return consecutiveEnding(days, addCalendarDays(today, -1));
}

/**
 * The first completed day after the last study day. Today does not count
 * until it ends, and a student who has never logged a day has no broken streak.
 */
export function brokenStreakDate(days: readonly string[], today: string): string | null {
  if (!isRealIsoDate(today) || days.length === 0) return null;
  const last = days[days.length - 1];
  if (!last || last >= today) return null;
  if (last === addCalendarDays(today, -1)) return null;
  return addCalendarDays(last, 1);
}

function statsFor(day: string, input: ReplayInput): DayStats {
  const upTo = input.days.filter((item) => item <= day);
  const set = new Set(upTo);
  let questions = 0;
  for (const item of upTo) questions += input.totals.get(item) ?? 0;
  return {
    streak: set.has(day) ? consecutiveEnding(set, day) : 0,
    studyDays: upTo.length,
    questions,
    points: pointsOnOrBefore(input.rewards, day),
  };
}

function nextStage(id: StageId): StageId | null {
  const index = STAGE_ORDER.indexOf(id);
  return STAGE_ORDER[index + 1] ?? null;
}

function meets(stage: Exclude<StageId, "new">, stats: DayStats): boolean {
  const rule = CONTINUITY[stage];
  return (
    stats.streak >= rule.streak &&
    stats.studyDays >= rule.studyDays &&
    stats.questions >= rule.questions &&
    stats.points >= minPoints(stage)
  );
}

function replayStage(input: ReplayInput): { id: StageId; earnedOn: string | null } {
  let current: StageId = "new";
  let earnedOn: string | null = null;
  for (const day of input.days) {
    const upcoming = nextStage(current);
    if (!upcoming || upcoming === "new") break;
    if (meets(upcoming, statsFor(day, input))) {
      current = upcoming;
      earnedOn = day;
    }
  }
  return { id: current, earnedOn };
}

type HealthReplay = {
  status: HealthStatus;
  sickSince: string | null;
  recoverySince: string | null;
};

function replayHealth(days: readonly string[], today: string): HealthReplay {
  if (days.length === 0)
    return { status: "healthy", sickSince: null, recoverySince: null };
  const set = new Set(days);
  let status: HealthStatus = "healthy";
  let inRecovery: boolean = false;
  let recoveryRun = 0;
  let missRun = 0;
  let sickSince: string | null = null;
  let recoverySince: string | null = null;
  let cursor = days[0] ?? today;

  while (cursor <= today) {
    const studied = set.has(cursor);
    if (cursor === today && !studied) break;

    if (studied) {
      missRun = 0;
      if (status === "sick" || inRecovery) {
        if (status === "sick") sickSince = null;
        if (recoverySince == null) recoverySince = cursor;
        inRecovery = true;
        recoveryRun += 1;
        if (recoveryRun >= 2) {
          status = "healthy";
          inRecovery = false;
          recoveryRun = 0;
          recoverySince = null;
          sickSince = null;
        } else {
          status = "recovering";
        }
      } else {
        status = "healthy";
        recoveryRun = 0;
        recoverySince = null;
      }
    } else {
      recoveryRun = 0;
      recoverySince = null;
      missRun += 1;
      if (missRun >= 3) {
        if (status !== "sick") sickSince = cursor;
        status = "sick";
        inRecovery = false;
      } else {
        status = "tired";
      }
    }
    cursor = addCalendarDays(cursor, 1);
  }

  return { status, sickSince, recoverySince };
}

function requirementList(
  stage: Exclude<StageId, "new">,
  stats: DayStats,
): GrowthRequirement[] {
  const rule = CONTINUITY[stage];
  const items: GrowthRequirement[] = [
    {
      id: "streak",
      current: stats.streak,
      target: rule.streak,
      unit: "gün",
      met: stats.streak >= rule.streak,
      gap: `${rule.streak} günlük seriyi tamamlaman gerekiyor`,
    },
    {
      id: "studyDays",
      current: stats.studyDays,
      target: rule.studyDays,
      unit: "gün",
      met: stats.studyDays >= rule.studyDays,
      gap: `${rule.studyDays} farklı çalışma günü gerekiyor. ${stats.studyDays} günün var.`,
    },
  ];
  if (rule.questions > 0) {
    items.push({
      id: "questions",
      current: stats.questions,
      target: rule.questions,
      unit: "soru",
      met: stats.questions >= rule.questions,
      gap: `${rule.questions} sorudan ${stats.questions} tanesini tamamladın`,
    });
  }
  const pointsTarget = minPoints(stage);
  items.push({
    id: "points",
    current: stats.points,
    target: pointsTarget,
    unit: MASCOT_MESSAGES.pointsUnit,
    met: stats.points >= pointsTarget,
    gap: `${pointsTarget} karakter puanından ${stats.points} tanesine ulaştın`,
  });
  return items;
}

function nextStepFor(
  unmet: GrowthRequirement | undefined,
  studiedToday: boolean,
  atMax: boolean,
): string {
  if (atMax || !unmet) return MASCOT_MESSAGES.growthMaxStage;
  if (unmet.id === "streak" || unmet.id === "studyDays") {
    return studiedToday
      ? MASCOT_MESSAGES.growthNextTomorrow
      : MASCOT_MESSAGES.growthNextLog;
  }
  if (unmet.id === "questions") return MASCOT_MESSAGES.growthNextQuestions;
  return MASCOT_MESSAGES.growthNextPoints;
}

function noticePlans(input: {
  today: string;
  days: readonly string[];
  health: HealthReplay;
  earnedOn: string | null;
}): GrowthNoticePlan[] {
  const notices: GrowthNoticePlan[] = [];
  const brokenOn = brokenStreakDate(input.days, input.today);
  if (brokenOn) notices.push({ kind: "streak_broken", noticeDate: brokenOn });
  if (input.health.status === "sick" && input.health.sickSince) {
    notices.push({ kind: "mascot_sick", noticeDate: input.health.sickSince });
  }
  if (input.health.status === "recovering" && input.health.recoverySince) {
    notices.push({ kind: "mascot_recovering", noticeDate: input.health.recoverySince });
  }
  if (input.earnedOn === input.today) {
    notices.push({ kind: "stage_earned", noticeDate: input.earnedOn });
  }
  return notices;
}

export function growthNoticeKey(notice: GrowthNoticePlan): string {
  return `${notice.kind}:${notice.noticeDate}`;
}

/** Same kind and date is one notice. A second call does not add another row. */
export function mergeGrowthNotices(
  existing: readonly GrowthNoticePlan[],
  incoming: readonly GrowthNoticePlan[],
): GrowthNoticePlan[] {
  const seen = new Set(existing.map(growthNoticeKey));
  const merged = [...existing];
  for (const notice of incoming) {
    const key = growthNoticeKey(notice);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(notice);
  }
  return merged;
}

export function evaluateGrowth(facts: GrowthFacts): GrowthView {
  const today = isRealIsoDate(facts.today) ? facts.today : STUDY_DATE_MIN;
  const totals = dayQuestions(facts.logs, today);
  const days = sortedDays(totals);
  const rewards = facts.rewards.filter((reward) => {
    if (reward.sourceDate == null) return true;
    return isCountedDay(reward.sourceDate, today);
  });
  const input: ReplayInput = { totals, days, rewards };
  const stage = replayStage(input);
  const upcoming = nextStage(stage.id);
  const todayStats = statsFor(today, input);
  const requirements =
    upcoming && upcoming !== "new" ? requirementList(upcoming, todayStats) : [];
  const health = replayHealth(days, today);
  const studiedToday = totals.has(today);
  const unmet = requirements.find((item) => !item.met);

  return {
    ruleVersion: GROWTH_RULE_VERSION,
    today,
    stageId: stage.id,
    stageName: stageName(stage.id),
    stageEarnedOn: stage.earnedOn,
    nextStageId: upcoming,
    nextStageName: upcoming ? stageName(upcoming) : null,
    points: pointsOnOrBefore(rewards, today),
    currentStreak: currentStreak(new Set(days), today),
    longestStreak: longestRun(days),
    studyDays: days.length,
    questions: todayStats.questions,
    studiedToday,
    health: health.status,
    requirements,
    nextStep: nextStepFor(unmet, studiedToday, upcoming == null),
    notices: noticePlans({ today, days, health, earnedOn: stage.earnedOn }),
  };
}

export function stageRank(id: StageId): number {
  const index = STAGE_ORDER.indexOf(id);
  return index < 0 ? 0 : index;
}

export function growthNoticeContent(
  kind: GrowthNoticeKind,
  stageName: string,
): { title: string; body: string } {
  if (kind === "streak_broken") {
    return {
      title: MASCOT_MESSAGES.noticeStreakTitle,
      body: MASCOT_MESSAGES.noticeStreakBody,
    };
  }
  if (kind === "mascot_sick") {
    return {
      title: MASCOT_MESSAGES.noticeSickTitle,
      body: MASCOT_MESSAGES.noticeSickBody,
    };
  }
  if (kind === "mascot_recovering") {
    return {
      title: MASCOT_MESSAGES.noticeRecoveringTitle,
      body: MASCOT_MESSAGES.noticeRecoveringBody,
    };
  }
  return { title: MASCOT_MESSAGES.noticeStageTitle, body: stageEarnedNotice(stageName) };
}
