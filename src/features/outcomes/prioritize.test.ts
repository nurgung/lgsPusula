import { describe, expect, it } from "vitest";
import {
  canShowNetTrend,
  mistakeWeight,
  OUTCOME_PRIORITY_RULE_VERSION,
  prioritiseOutcomes,
  type PrioritisableMistake,
} from "./prioritize";

const base = {
  subjectId: "sub-1",
  subjectName: "Matematik",
} as const;

function mistake(
  partial: Partial<PrioritisableMistake> &
    Pick<PrioritisableMistake, "outcomeId" | "outcomeCode" | "kind" | "takenOn">,
): PrioritisableMistake {
  return {
    outcomeDescription: "Örnek kazanım",
    ...base,
    ...partial,
  };
}

describe("prioritiseOutcomes", () => {
  it("returns an empty list when nothing was tagged (no invented detection)", () => {
    expect(prioritiseOutcomes([])).toEqual([]);
  });

  it("scores wrong higher than blank and sorts by score then recency", () => {
    const ranked = prioritiseOutcomes([
      mistake({
        outcomeId: "a",
        outcomeCode: "M.8.1.1",
        kind: "blank",
        takenOn: "2026-10-10",
      }),
      mistake({
        outcomeId: "b",
        outcomeCode: "M.8.1.2",
        kind: "wrong",
        takenOn: "2026-10-01",
      }),
      mistake({
        outcomeId: "a",
        outcomeCode: "M.8.1.1",
        kind: "wrong",
        takenOn: "2026-10-18",
      }),
    ]);

    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({
      outcomeId: "a",
      score: mistakeWeight("blank") + mistakeWeight("wrong"),
      wrongCount: 1,
      blankCount: 1,
      lastTakenOn: "2026-10-18",
      ruleVersion: OUTCOME_PRIORITY_RULE_VERSION,
    });
    expect(ranked[1]).toMatchObject({
      outcomeId: "b",
      score: mistakeWeight("wrong"),
      wrongCount: 1,
      blankCount: 0,
    });
  });

  it("does not invent a priority from exam wrong totals alone", () => {
    // Callers may know an exam had 6 wrong answers; without tagged rows the rule
    // still yields nothing — the empty state must say matching is missing.
    expect(prioritiseOutcomes([])).toEqual([]);
  });
});

describe("canShowNetTrend", () => {
  it("needs at least two exams", () => {
    expect(canShowNetTrend(0)).toBe(false);
    expect(canShowNetTrend(1)).toBe(false);
    expect(canShowNetTrend(2)).toBe(true);
  });
});
