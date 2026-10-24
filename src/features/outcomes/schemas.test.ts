import { describe, expect, it } from "vitest";
import { parseMistakeReplaceInput } from "./schemas";

const resultId = "11111111-1111-4111-8111-111111111111";
const subjectId = "22222222-2222-4222-8222-222222222222";
const outcomeId = "33333333-3333-4333-8333-333333333333";
const otherOutcome = "44444444-4444-4444-8444-444444444444";

describe("parseMistakeReplaceInput", () => {
  const budgets = [{ resultId, subjectId, wrongCount: 2, blankCount: 1 }] as const;

  const outcomes = new Map([
    [
      outcomeId,
      {
        id: outcomeId,
        subjectId,
        archived: false,
        topicArchived: false,
        subjectArchived: false,
      },
    ],
    [
      otherOutcome,
      {
        id: otherOutcome,
        subjectId: "55555555-5555-4555-8555-555555555555",
        archived: false,
        topicArchived: false,
        subjectArchived: false,
      },
    ],
  ]);

  it("accepts manual rows within wrong/blank budgets", () => {
    const parsed = parseMistakeReplaceInput(
      [
        {
          resultId,
          kind: "wrong",
          catalogItem: `outcome:${outcomeId}`,
          sortOrder: "0",
        },
        {
          resultId,
          kind: "blank",
          catalogItem: `outcome:${outcomeId}`,
          sortOrder: "1",
        },
      ],
      budgets,
      outcomes,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      source: "manual",
      confidence: "high",
      outcomeId,
    });
  });

  it("rejects more wrong mappings than the subject wrong count", () => {
    const parsed = parseMistakeReplaceInput(
      [
        {
          resultId,
          kind: "wrong",
          catalogItem: `outcome:${outcomeId}`,
          sortOrder: "0",
        },
        {
          resultId,
          kind: "wrong",
          catalogItem: `outcome:${outcomeId}`,
          sortOrder: "1",
        },
        {
          resultId,
          kind: "wrong",
          catalogItem: `outcome:${outcomeId}`,
          sortOrder: "2",
        },
      ],
      budgets,
      outcomes,
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.fieldErrors["row2.kind"]).toMatch(/fazla eşleştirme/i);
  });

  it("ignores empty slots and keeps the filled wrong mappings", () => {
    const parsed = parseMistakeReplaceInput(
      [
        {
          resultId,
          kind: "wrong",
          catalogItem: `outcome:${outcomeId}`,
          sortOrder: "0",
        },
        { resultId, kind: "wrong", catalogItem: "", sortOrder: "1" },
        { resultId, kind: "wrong", catalogItem: "   ", sortOrder: "2" },
      ],
      budgets,
      outcomes,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(1);
  });

  it("rejects an outcome from another subject", () => {
    const parsed = parseMistakeReplaceInput(
      [
        {
          resultId,
          kind: "wrong",
          catalogItem: `outcome:${otherOutcome}`,
          sortOrder: "0",
        },
      ],
      budgets,
      outcomes,
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.fieldErrors["row0.catalogItem"]).toMatch(/aynı olmalı/i);
  });
});
