import { describe, expect, it } from "vitest";
import { CURRENT_RULE_VERSION, getNetRule } from "./net-rules";
import { parseExamInput } from "./schemas";

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
    }
  });
});
