import { describe, expect, it, vi } from "vitest";
import { buildExamPayload, commitExam, type ExamPayload, type StoredExam } from "./commit-exam";
import { CURRENT_RULE_VERSION } from "./net-rules";

const payload: ExamPayload = buildExamPayload(
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000099",
  {
    title: "Branş",
    takenOn: "2026-10-19",
    examType: "branch",
    ruleVersion: CURRENT_RULE_VERSION,
    subjects: [
      {
        subjectCode: "matematik",
        subjectId: "00000000-0000-4000-8000-000000000010",
        questionCount: 10,
        correctCount: 0,
        wrongCount: 6,
        blankCount: 4,
      },
    ],
  },
);

describe("buildExamPayload", () => {
  it("recomputes nets so a negative subject floors the total at 0", () => {
    expect(payload.subjects[0]?.net).toBe(-2);
    expect(payload.totalNet).toBe(0);
  });
});

describe("commitExam", () => {
  it("inserts once and treats an identical retry as unchanged", async () => {
    const stored: StoredExam = { ...payload, id: "exam-1" };
    const insert = vi.fn(async () => stored);
    const findByRequestId = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(stored);

    const first = await commitExam(payload, { insert, findByRequestId });
    expect(first).toEqual({ status: "created", exam: stored });
    expect(insert).toHaveBeenCalledOnce();

    const second = await commitExam(payload, { insert, findByRequestId });
    expect(second).toEqual({ status: "unchanged", exam: stored });
    expect(insert).toHaveBeenCalledOnce();
  });

  it("rejects a second payload with the same request id", async () => {
    const stored: StoredExam = { ...payload, id: "exam-1" };
    const result = await commitExam(
      { ...payload, title: "Başka ad" },
      {
        insert: async () => stored,
        findByRequestId: async () => stored,
      },
    );
    expect(result).toEqual({ status: "conflict" });
  });
});
