import { STAGE_LEVELS, type StageId } from "@/features/mascot/constants";
import { badgesFor, stageForPoints, type BadgeView } from "@/features/mascot/rules";
import type { SpeciesCode } from "@/features/mascot/species";

/**
 * What changed because of this save. A later visit the same day does not invent
 * a second crossing: the caller compares the snapshot from before the write.
 */
export type ProgressSnapshot = {
  points: number;
  badgeIds: readonly BadgeView["id"][];
  /** Null when the student has no all-subjects daily goal. */
  dailyGoalTarget: number | null;
  todayQuestionCount: number;
};

export type CelebrationKind =
  | { reason: "goal" }
  | { reason: "badge"; badgeId: BadgeView["id"] }
  | { reason: "stage"; stageId: StageId }
  | { reason: "practice" };

export type CelebrationCopy = {
  heading: string;
  detail: string;
};

export function goalMet(snapshot: ProgressSnapshot): boolean {
  return (
    snapshot.dailyGoalTarget != null &&
    snapshot.todayQuestionCount >= snapshot.dailyGoalTarget
  );
}

/**
 * One reason, in the order a student would care about on this save:
 * the daily question goal, then a new badge, then a stage step forward.
 * A missed day cannot appear here; points are never removed.
 */
export function crossedCelebration(
  before: ProgressSnapshot,
  after: ProgressSnapshot,
): CelebrationKind | null {
  if (!goalMet(before) && goalMet(after)) return { reason: "goal" };

  const badgeId = after.badgeIds.find((id) => !before.badgeIds.includes(id));
  if (badgeId) return { reason: "badge", badgeId };

  const previous = stageForPoints(before.points);
  const next = stageForPoints(after.points);
  if (previous.id !== next.id && after.points > before.points) {
    return { reason: "stage", stageId: next.id };
  }
  return null;
}

export function celebrationCopy(kind: CelebrationKind): CelebrationCopy {
  if (kind.reason === "practice") {
    return {
      heading: "Başarıya bir adım daha yaklaştın.",
      detail: "Bu kazanımın sorularını bitirdin. Sıradaki yanlış veya boş kazanıma geçebilirsin.",
    };
  }
  if (kind.reason === "goal") {
    return {
      heading: "Hedefe ulaştın.",
      detail: "Bugünkü soru hedefin tamam.",
    };
  }
  if (kind.reason === "badge") {
    const badge = badgesFor([]).find((item) => item.id === kind.badgeId);
    const name = badge?.name ?? "Rozet";
    return {
      heading: `${name} rozetini aldın.`,
      detail: badge?.description ?? "Bu rozet sende kalır.",
    };
  }
  const stage = STAGE_LEVELS.find((level) => level.id === kind.stageId);
  const name = stage?.name ?? "Yeni arkadaş";
  return {
    heading: `${name} aşamasına geldin.`,
    detail: "Bu aşama sende kalır. Bir gün ara vermek geri götürmez.",
  };
}

export function stageStillCurrent(points: number, stageId: StageId): boolean {
  return stageForPoints(points).id === stageId;
}

export function celebrationStillHolds(
  snapshot: ProgressSnapshot,
  kind: CelebrationKind,
): boolean {
  if (kind.reason === "practice") return false;
  if (kind.reason === "goal") return goalMet(snapshot);
  if (kind.reason === "badge") return snapshot.badgeIds.includes(kind.badgeId);
  return stageStillCurrent(snapshot.points, kind.stageId);
}

export type CelebrationTask = {
  id: string;
  title: string;
  done: boolean;
};

/** Built on the server from the signed reason and the student's current rows. */
export type CelebrationView = {
  heading: string;
  detail: string;
  stageId: StageId;
  species: SpeciesCode | null;
  tasks: CelebrationTask[];
};
