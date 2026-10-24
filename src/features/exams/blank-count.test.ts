import { describe, expect, it } from "vitest";
import { deriveBlankCount } from "./blank-count";

describe("deriveBlankCount", () => {
  it("starts from the full question count when correct and wrong are empty", () => {
    expect(deriveBlankCount({ questionCount: 20, correct: "", wrong: "" })).toEqual({
      value: "20",
    });
  });

  it("subtracts correct and wrong from the question count", () => {
    expect(deriveBlankCount({ questionCount: 20, correct: "12", wrong: "3" })).toEqual({
      value: "5",
    });
  });

  it("treats a single empty side as zero while the other is written", () => {
    expect(deriveBlankCount({ questionCount: 10, correct: "6", wrong: "" })).toEqual({
      value: "4",
    });
  });

  it("leaves blank empty when correct and wrong pass the question count", () => {
    expect(deriveBlankCount({ questionCount: 20, correct: "15", wrong: "8" })).toEqual({
      value: "",
      error: "Doğru ve yanlış toplamı soru sayısını geçemez.",
    });
  });

  it("rejects a count that is not a whole number", () => {
    expect(deriveBlankCount({ questionCount: 20, correct: "1.5", wrong: "0" }).error).toMatch(
      /tam sayı/,
    );
  });

  it("waits for a question count before calculating", () => {
    expect(deriveBlankCount({ questionCount: null, correct: "1", wrong: "0" })).toEqual({
      value: "",
    });
  });
});
