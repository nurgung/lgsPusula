import { describe, expect, it } from "vitest";
import {
  CURRENT_RULE_VERSION,
  computeExamNets,
  computeSubjectNet,
  computeTotalNet,
  formatExamScore,
  formatNet,
  getNetRule,
} from "./net-rules";

describe("computeSubjectNet", () => {
  it("uses doğru − yanlış ÷ 3 and ignores blank", () => {
    expect(computeSubjectNet(15, 3)).toBe(14);
    expect(computeSubjectNet(0, 3)).toBe(-1);
    expect(computeSubjectNet(10, 0)).toBe(10);
  });
});

describe("computeTotalNet", () => {
  it("sums subject nets including negatives", () => {
    expect(computeTotalNet([14, -2, 0])).toBe(12);
  });

  it("floors a negative sum at 0", () => {
    expect(computeTotalNet([-1, -1])).toBe(0);
    expect(computeTotalNet([-2])).toBe(0);
  });
});

describe("lgs-v1 full paper", () => {
  const rule = getNetRule("lgs-v1");
  const slots = rule.examTypes.lgs_full.subjects;

  function full(
    overrides: Partial<Record<string, { c: number; w: number; b: number }>> = {},
  ) {
    return slots.map((slot) => {
      const o = overrides[slot.code];
      const correct = o?.c ?? 0;
      const wrong = o?.w ?? 0;
      const blank = o?.b ?? slot.questionCount - correct - wrong;
      return {
        subjectCode: slot.code,
        questionCount: slot.questionCount,
        correctCount: correct,
        wrongCount: wrong,
        blankCount: blank,
      };
    });
  }

  it("matches the decision 0.7 example (Türkçe 14, Matematik −2, total 12)", () => {
    const result = computeExamNets("lgs_full", CURRENT_RULE_VERSION, full({
      turkce: { c: 15, w: 3, b: 2 },
      matematik: { c: 0, w: 6, b: 14 },
    }));
    expect(result.ruleVersion).toBe("lgs-v1");
    expect(result.subjects.find((s) => s.subjectCode === "turkce")?.net).toBe(14);
    expect(result.subjects.find((s) => s.subjectCode === "matematik")?.net).toBe(-2);
    expect(result.totalNet).toBe(12);
  });

  it("floors a negative total at 0 while keeping a negative subject net", () => {
    const result = computeExamNets(
      "lgs_full",
      CURRENT_RULE_VERSION,
      full({ matematik: { c: 0, w: 6, b: 14 } }),
    );
    expect(result.subjects.find((s) => s.subjectCode === "matematik")?.net).toBe(-2);
    expect(result.totalNet).toBe(0);
  });

  it("uses the fixed LGS question distribution (90)", () => {
    expect(slots.reduce((sum, slot) => sum + slot.questionCount, 0)).toBe(90);
    expect(slots.map((s) => s.questionCount)).toEqual([20, 20, 20, 10, 10, 10]);
  });
});

describe("branch exams", () => {
  it("allows a negative subject net but floors the total at 0", () => {
    const result = computeExamNets("branch", CURRENT_RULE_VERSION, [
      {
        subjectCode: "matematik",
        questionCount: 10,
        correctCount: 0,
        wrongCount: 6,
        blankCount: 4,
      },
    ]);
    expect(result.subjects[0]?.net).toBe(-2);
    expect(result.totalNet).toBe(0);
  });

  it("keeps a positive branch net as the total", () => {
    const result = computeExamNets("branch", CURRENT_RULE_VERSION, [
      {
        subjectCode: "turkce",
        questionCount: 20,
        correctCount: 15,
        wrongCount: 3,
        blankCount: 2,
      },
    ]);
    expect(result.subjects[0]?.net).toBe(14);
    expect(result.totalNet).toBe(14);
  });
});

describe("formatNet", () => {
  it("shows two decimal places in Turkish", () => {
    expect(formatNet(14)).toBe("14,00");
    expect(formatNet(-1).replace("−", "-")).toBe("-1,00");
    expect(formatNet(1 / 3)).toMatch(/0,33/);
  });
});

describe("formatExamScore", () => {
  it("shows up to three decimal places in Turkish without inventing trailing zeros", () => {
    expect(formatExamScore(null)).toBe("Kayıt yok");
    expect(formatExamScore(412)).toBe("412");
    expect(formatExamScore(412.5)).toBe("412,5");
    expect(formatExamScore(431.25)).toBe("431,25");
    expect(formatExamScore(412.555)).toBe("412,555");
  });
});
