import { describe, expect, it } from "vitest";
import { studyGoalSchema, studyLogSchema } from "./schemas";

const today = "2026-10-19";
const subjectId = "00000000-0000-4000-8000-000000000001";

const valid = {
  studiedOn: today,
  subjectId,
  catalogItem: "",
  questionCount: "5",
  correctCount: "3",
  wrongCount: "1",
  blankCount: "1",
  durationMinutes: "0",
};

describe("studyLogSchema", () => {
  it("accepts a consistent non-negative log", () => {
    expect(studyLogSchema(today).safeParse(valid).success).toBe(true);
  });

  it("rejects a negative count", () => {
    const parsed = studyLogSchema(today).safeParse({ ...valid, wrongCount: "-1" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "wrongCount")).toBe(
        true,
      );
    }
  });

  it("rejects a total that does not match the question count", () => {
    const parsed = studyLogSchema(today).safeParse({
      ...valid,
      questionCount: "5",
      correctCount: "1",
      wrongCount: "1",
      blankCount: "1",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message)).toContain(
        "Doğru, yanlış ve boş toplamı soru sayısına eşit olmalı.",
      );
    }
  });

  it("rejects a future Istanbul date and a log with no questions", () => {
    expect(
      studyLogSchema(today).safeParse({ ...valid, studiedOn: "2026-10-20" }).success,
    ).toBe(false);
    expect(
      studyLogSchema(today).safeParse({
        ...valid,
        questionCount: "0",
        correctCount: "0",
        wrongCount: "0",
        blankCount: "0",
      }).success,
    ).toBe(false);
  });
});

describe("studyGoalSchema", () => {
  it("accepts a general daily goal and rejects zero or a negative target", () => {
    expect(
      studyGoalSchema().safeParse({ period: "day", subjectId: "", targetQuestions: "10" })
        .success,
    ).toBe(true);
    expect(
      studyGoalSchema().safeParse({ period: "week", subjectId: "", targetQuestions: "0" })
        .success,
    ).toBe(false);
    expect(
      studyGoalSchema().safeParse({ period: "day", subjectId: "", targetQuestions: "-3" })
        .success,
    ).toBe(false);
  });
});
