import { describe, expect, it } from "vitest";
import {
  parseComparisonQuery,
  questionsInWindow,
  summarizeLogs,
  type StudyLogView,
} from "./summary";

const log = (
  overrides: Partial<StudyLogView> &
    Pick<StudyLogView, "id" | "studiedOn" | "questionCount">,
): StudyLogView => ({
  subjectId: "subject-1",
  subjectName: "Matematik",
  topicId: null,
  topicName: null,
  outcomeId: null,
  outcomeCode: null,
  correctCount: overrides.questionCount,
  wrongCount: 0,
  blankCount: 0,
  durationMinutes: 10,
  ...overrides,
});

describe("summarizeLogs", () => {
  const logs = [
    log({
      id: "a",
      studiedOn: "2026-10-19",
      questionCount: 4,
      correctCount: 3,
      wrongCount: 1,
      blankCount: 0,
      durationMinutes: 20,
    }),
    log({
      id: "b",
      studiedOn: "2026-10-19",
      questionCount: 6,
      correctCount: 6,
      durationMinutes: 15,
      subjectId: "subject-2",
      subjectName: "Fen",
    }),
    log({
      id: "c",
      studiedOn: "2026-10-18",
      questionCount: 100,
      correctCount: 100,
      durationMinutes: 50,
    }),
  ];

  it("matches the sum of the logs inside the day and ignores the other day", () => {
    const summary = summarizeLogs(logs, { from: "2026-10-19", to: "2026-10-19" });
    const sameDay = logs.filter((item) => item.studiedOn === "2026-10-19");
    expect(summary.questionCount).toBe(
      sameDay.reduce((sum, item) => sum + item.questionCount, 0),
    );
    expect(summary.correctCount).toBe(
      sameDay.reduce((sum, item) => sum + item.correctCount, 0),
    );
    expect(summary.wrongCount).toBe(
      sameDay.reduce((sum, item) => sum + item.wrongCount, 0),
    );
    expect(summary.blankCount).toBe(
      sameDay.reduce((sum, item) => sum + item.blankCount, 0),
    );
    expect(summary.durationMinutes).toBe(
      sameDay.reduce((sum, item) => sum + item.durationMinutes, 0),
    );
    expect(summary.questionCount).toBe(10);
    expect(summary.bySubject).toEqual([
      {
        subjectId: "subject-2",
        subjectName: "Fen",
        questionCount: 6,
        correctCount: 6,
        wrongCount: 0,
        blankCount: 0,
        durationMinutes: 15,
      },
      {
        subjectId: "subject-1",
        subjectName: "Matematik",
        questionCount: 4,
        correctCount: 3,
        wrongCount: 1,
        blankCount: 0,
        durationMinutes: 20,
      },
    ]);
  });

  it("counts a subject goal separately from the general total", () => {
    expect(
      questionsInWindow(logs, { from: "2026-10-19", to: "2026-10-19" }, "subject-1"),
    ).toBe(4);
    expect(questionsInWindow(logs, { from: "2026-10-19", to: "2026-10-19" }, null)).toBe(
      10,
    );
  });
});

describe("parseComparisonQuery", () => {
  it("uses this week so far and the previous week when no dates are sent", () => {
    const parsed = parseComparisonQuery(
      { from1: "", to1: "", from2: "", to2: "" },
      "2026-10-21",
    );
    expect(parsed).toEqual({
      ok: true,
      isDefault: true,
      first: { from: "2026-10-19", to: "2026-10-21" },
      second: { from: "2026-10-12", to: "2026-10-18" },
    });
  });

  it("rejects a partial range and a future end date", () => {
    expect(
      parseComparisonQuery(
        { from1: "2026-10-01", to1: "", from2: "", to2: "" },
        "2026-10-21",
      ).ok,
    ).toBe(false);
    const future = parseComparisonQuery(
      {
        from1: "2026-10-01",
        to1: "2026-10-22",
        from2: "2026-09-01",
        to2: "2026-09-07",
      },
      "2026-10-21",
    );
    expect(future.ok).toBe(false);
  });
});
