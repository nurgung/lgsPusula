import { describe, expect, it } from "vitest";
import { REWARD_POINTS } from "./constants";
import { MASCOT_MESSAGES, reminderSensitiveIssues, supportiveCopyIssues } from "./messages";
import { SPECIES } from "./species";
import {
  badgesFor,
  planRewardKeys,
  pointsAfterMissedDay,
  pointsForEvent,
  stageForPoints,
  tasksFor,
  totalPoints,
  type RewardEvent,
} from "./rules";

const event = (
  eventType: RewardEvent["eventType"],
  sourceDate: string | null,
): RewardEvent => ({
  eventType,
  points: pointsForEvent(eventType),
  sourceDate,
  ruleVersion: "mascot-v1",
});

describe("mascot rewards", () => {
  it("plans each idempotency key once", () => {
    const keys = ["study_log:a", "study_log:a", "daily_goal:2026-10-20"];
    expect(planRewardKeys(keys)).toEqual(["study_log:a", "daily_goal:2026-10-20"]);
    expect(planRewardKeys(planRewardKeys(keys))).toEqual(planRewardKeys(keys));
  });

  it("keeps the same points and stage when a day is missed", () => {
    const before = [event("study_log", "2026-10-18"), event("daily_goal", "2026-10-18")];
    const points = pointsAfterMissedDay(before);
    expect(points).toBe(REWARD_POINTS.study_log + REWARD_POINTS.daily_goal);
    expect(totalPoints(before)).toBe(points);
    expect(stageForPoints(points)).toEqual(stageForPoints(pointsAfterMissedDay(before)));
    expect(stageForPoints(points).id).toBe("settling");
  });

  it("does not move the stage backwards when stored points stay", () => {
    const grown = stageForPoints(30);
    expect(grown.id).toBe("growing");
    expect(stageForPoints(grown.points).id).toBe("growing");
    expect(stageForPoints(9).id).toBe("new");
    expect(stageForPoints(60).nextName).toBeNull();
  });

  it("keeps the three-day badge when a day in between is empty", () => {
    const badges = badgesFor([
      event("study_log", "2026-10-01"),
      event("study_log", "2026-10-02"),
      event("study_log", "2026-10-04"),
    ]);
    expect(badges.find((badge) => badge.id === "steady_days")?.earned).toBe(true);
    expect(badges.find((badge) => badge.id === "goal_met")?.earned).toBe(false);
  });

  it("does not award a review task a score, and hides it when nothing is unlinked", () => {
    const open = tasksFor({
      todayLogCount: 0,
      todayQuestionCount: 0,
      dailyGoalTarget: 10,
      reviewExamId: "exam-1",
    });
    expect(open.map((task) => task.id)).toEqual(["log_today", "meet_goal", "review_outcome"]);
    expect(open[2]?.title).not.toMatch(/net|puan|yanlış|doğru/i);
    const done = tasksFor({
      todayLogCount: 1,
      todayQuestionCount: 10,
      dailyGoalTarget: 10,
      reviewExamId: null,
    });
    expect(done.every((task) => task.done)).toBe(true);
    expect(done.some((task) => task.id === "review_outcome")).toBe(false);
  });
});

describe("mascot copy", () => {
  it("stays supportive and keeps exam results out of the reminder", () => {
    const texts = [
      ...Object.values(MASCOT_MESSAGES),
      ...SPECIES.flatMap((species) => [species.name, species.description, species.kindLabel]),
    ];
    for (const text of texts) {
      expect(supportiveCopyIssues(text)).toEqual([]);
    }
    expect(reminderSensitiveIssues(MASCOT_MESSAGES.reminderBody)).toEqual([]);
    expect(supportiveCopyIssues(MASCOT_MESSAGES.noRegression)).toEqual([]);
  });
});
