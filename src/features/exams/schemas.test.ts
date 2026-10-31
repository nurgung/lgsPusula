import { describe, expect, it } from "vitest";
import { CURRENT_RULE_VERSION, getNetRule } from "./net-rules";
import { parseExamInput, parseOptionalExamScore } from "./schemas";

const ids = new Map(
  getNetRule(CURRENT_RULE_VERSION).examTypes.lgs_full.subjects.map((slot, index) => [
    slot.code,
    `00000000-0000-4000-8000-00000000000${index}`,
  ]),
);

describe("parseExamInput", () => {
  it("rejects negative counts and inconsistent totals", () => {
    const result = parseExamInput(
      {
        title: "Branş",
        takenOn: "2026-10-19",
        examType: "branch",
        "branch.subjectId": ids.get("matematik")!,
        "branch.questionCount": "10",
        "branch.correctCount": "6",
        "branch.wrongCount": "3",
        "branch.blankCount": "2",
      },
      "2026-10-19",
      ids,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors["branch.questionCount"]).toMatch(/eşit/);
    }
  });

  it("rejects a future date", () => {
    const result = parseExamInput(
      {
        title: "Branş",
        takenOn: "2026-10-20",
        examType: "branch",
        "branch.subjectId": ids.get("matematik")!,
        "branch.questionCount": "5",
        "branch.correctCount": "3",
        "branch.wrongCount": "1",
        "branch.blankCount": "1",
      },
      "2026-10-19",
      ids,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.takenOn).toMatch(/İleri/);
  });

  it("accepts a full LGS paper with fixed question counts", () => {
    const values: Record<string, string> = {
      title: "Ekim denemesi",
      takenOn: "2026-10-19",
      examType: "lgs_full",
      score: "412,5",
    };
    for (const slot of getNetRule(CURRENT_RULE_VERSION).examTypes.lgs_full.subjects) {
      values[`${slot.code}.correctCount`] = "0";
      values[`${slot.code}.wrongCount`] = "0";
      values[`${slot.code}.blankCount`] = String(slot.questionCount);
    }
    const result = parseExamInput(values, "2026-10-19", ids);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.subjects).toHaveLength(6);
      expect(result.data.ruleVersion).toBe("lgs-v1");
      expect(result.data.score).toBe(412.5);
    }
  });

  it("keeps score optional and rejects out-of-range values", () => {
    expect(parseOptionalExamScore("")).toEqual({ ok: true, value: null });
    expect(parseOptionalExamScore("350")).toEqual({ ok: true, value: 350 });
    expect(parseOptionalExamScore("501").ok).toBe(false);
    expect(parseOptionalExamScore("-1").ok).toBe(false);
  });

  it("accepts comma or dot decimals up to three places", () => {
    expect(parseOptionalExamScore("412,5")).toEqual({ ok: true, value: 412.5 });
    expect(parseOptionalExamScore("412.55")).toEqual({ ok: true, value: 412.55 });
    expect(parseOptionalExamScore("412,555")).toEqual({ ok: true, value: 412.555 });
    expect(parseOptionalExamScore("0,001")).toEqual({ ok: true, value: 0.001 });
    expect(parseOptionalExamScore("500,000")).toEqual({ ok: true, value: 500 });
    expect(parseOptionalExamScore("412,5555").ok).toBe(false);
    expect(parseOptionalExamScore("412,").ok).toBe(false);
    expect(parseOptionalExamScore("412.5555").ok).toBe(false);
  });
});
