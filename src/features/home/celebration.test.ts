import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { supportiveCopyIssues as coachingIssues } from "@/features/coaching/messages";
import { supportiveCopyIssues as mascotIssues } from "@/features/mascot/messages";
import {
  celebrationCopy,
  celebrationStillHolds,
  crossedCelebration,
  type CelebrationKind,
  type ProgressSnapshot,
} from "./celebration";
import {
  readCelebration,
  signCelebration,
  withCelebrationParam,
} from "./celebration-token";

const secret = "test-secret-test-secret-test-secret";

function snap(partial: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return {
    points: 0,
    badgeIds: [],
    dailyGoalTarget: null,
    todayQuestionCount: 0,
    stageId: "new",
    ...partial,
  };
}

describe("crossedCelebration", () => {
  it("stays closed when there is no goal and nothing else is new", () => {
    expect(
      crossedCelebration(
        snap({ todayQuestionCount: 0 }),
        snap({ todayQuestionCount: 4 }),
      ),
    ).toBeNull();
  });

  it("stays closed when the daily goal is not met yet", () => {
    const before = snap({ dailyGoalTarget: 10, todayQuestionCount: 4 });
    const after = snap({ dailyGoalTarget: 10, todayQuestionCount: 9 });
    expect(crossedCelebration(before, after)).toBeNull();
  });

  it("opens when this save meets the daily goal for the first time", () => {
    const before = snap({ dailyGoalTarget: 10, todayQuestionCount: 4 });
    const after = snap({
      dailyGoalTarget: 10,
      todayQuestionCount: 10,
      points: 15,
      badgeIds: ["first_step", "goal_met"],
    });
    expect(crossedCelebration(before, after)).toEqual({ reason: "goal" });
  });

  it("does not open again when the goal was already met", () => {
    const met = snap({
      dailyGoalTarget: 10,
      todayQuestionCount: 10,
      points: 15,
      badgeIds: ["first_step", "goal_met"],
    });
    const more = snap({
      dailyGoalTarget: 10,
      todayQuestionCount: 12,
      points: 20,
      badgeIds: ["first_step", "goal_met"],
    });
    expect(crossedCelebration(met, more)).toBeNull();
  });

  it("names a new badge when the goal is not the reason", () => {
    expect(
      crossedCelebration(snap(), snap({ points: 5, badgeIds: ["first_step"] })),
    ).toEqual({ reason: "badge", badgeId: "first_step" });
  });

  it("does not open a stage when only the point total crosses a threshold", () => {
    const before = snap({ points: 5, badgeIds: ["first_step"], stageId: "new" });
    const after = snap({ points: 10, badgeIds: ["first_step"], stageId: "new" });
    expect(crossedCelebration(before, after)).toBeNull();
  });

  it("names a forward stage and ignores a move back to an earlier stage", () => {
    const before = snap({ points: 35, badgeIds: ["first_step"], stageId: "settling" });
    const after = snap({ points: 40, badgeIds: ["first_step"], stageId: "growing" });
    expect(crossedCelebration(before, after)).toEqual({
      reason: "stage",
      stageId: "growing",
    });
    expect(crossedCelebration(after, before)).toBeNull();
  });
});

describe("celebration copy", () => {
  const kinds: CelebrationKind[] = [
    { reason: "goal" },
    { reason: "badge", badgeId: "first_step" },
    { reason: "badge", badgeId: "goal_met" },
    { reason: "badge", badgeId: "steady_days" },
    { reason: "badge", badgeId: "reviewer" },
    { reason: "badge", badgeId: "exam_noted" },
    { reason: "stage", stageId: "settling" },
    { reason: "stage", stageId: "growing" },
    { reason: "stage", stageId: "companion" },
    { reason: "practice" },
  ];

  it("uses the real Turkish name and stays supportive", () => {
    for (const kind of kinds) {
      const copy = celebrationCopy(kind);
      const text = `${copy.heading} ${copy.detail}`;
      expect(mascotIssues(text)).toEqual([]);
      expect(coachingIssues(text)).toEqual([]);
      expect(text).not.toMatch(/level|explorer|nft|telegram/i);
      expect(text).not.toContain("LEVEL UP");
    }
    expect(celebrationCopy({ reason: "goal" }).detail).toBe(
      "Bugünkü soru hedefin tamam.",
    );
    expect(celebrationCopy({ reason: "stage", stageId: "growing" }).heading).toBe(
      "Birlikte büyüyor aşamasına geldin.",
    );
    expect(celebrationCopy({ reason: "practice" }).heading).toBe(
      "Başarıya bir adım daha yaklaştın.",
    );
  });

  it("drops a goal marker once the goal is no longer met", () => {
    const open = snap({ dailyGoalTarget: 10, todayQuestionCount: 10 });
    expect(celebrationStillHolds(open, { reason: "goal" })).toBe(true);
    expect(
      celebrationStillHolds(snap({ dailyGoalTarget: 10, todayQuestionCount: 3 }), {
        reason: "goal",
      }),
    ).toBe(false);
    expect(
      celebrationStillHolds(snap({ dailyGoalTarget: null }), { reason: "goal" }),
    ).toBe(false);
    expect(celebrationStillHolds(snap({ points: 30 }), { reason: "practice" })).toBe(
      false,
    );
  });
});

describe("celebration token", () => {
  it("round-trips and rejects a tampered or expired marker", () => {
    const token = signCelebration(
      {
        studentId: "student-123456789012345678901234",
        kind: { reason: "stage", stageId: "settling" },
        expiresAt: 2_000,
      },
      secret,
    );
    expect(readCelebration(token, secret, 1_000)?.kind).toEqual({
      reason: "stage",
      stageId: "settling",
    });
    expect(readCelebration(token, secret, 2_000)).toBeNull();
    expect(readCelebration(`${token}x`, secret, 1_000)).toBeNull();
    expect(readCelebration(token, "another-secret-another-secret-xx", 1_000)).toBeNull();
    const practice = signCelebration(
      {
        studentId: "student-123456789012345678901234",
        kind: { reason: "practice" },
        expiresAt: 2_000,
      },
      secret,
    );
    expect(readCelebration(practice, secret, 1_000)?.kind).toEqual({
      reason: "practice",
    });
    expect(withCelebrationParam("/ogrenci", practice, "alkis")).toContain("alkis=");
    expect(withCelebrationParam("/ogrenci/calisma?durum=kaydedildi", token)).toContain(
      "kutlama=",
    );
    expect(withCelebrationParam("/ogrenci/calisma?durum=kaydedildi", null)).toBe(
      "/ogrenci/calisma?durum=kaydedildi",
    );
  });
});

describe("reduced motion styles", () => {
  it("keeps confetti and the path animation inside the no-preference query", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain(
      ".celebration-confetti,\n.practice-confetti {\n  display: none;",
    );
    expect(css).toContain("@keyframes practice-confetti");
    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(css).toContain(".stage-current-motion");
  });
});
