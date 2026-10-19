import { describe, expect, it } from "vitest";
import { commitStudyLog, type StudyLogPayload, type StoredStudyLog } from "./commit-log";

const payload = (overrides: Partial<StudyLogPayload> = {}): StudyLogPayload => ({
  studentId: "student-a",
  studiedOn: "2026-10-19",
  subjectId: "subject-1",
  topicId: null,
  outcomeId: null,
  questionCount: 5,
  correctCount: 3,
  wrongCount: 1,
  blankCount: 1,
  durationMinutes: 20,
  requestId: "request-1",
  ...overrides,
});

function memoryStore(seed: StoredStudyLog[] = []) {
  const rows = [...seed];
  return {
    rows,
    async insert(row: StudyLogPayload) {
      const existing = rows.find(
        (item) => item.studentId === row.studentId && item.requestId === row.requestId,
      );
      if (existing) return { status: "exists" as const };
      rows.push({ ...row, id: `id-${rows.length + 1}` });
      return { status: "created" as const, id: rows[rows.length - 1]!.id };
    },
    async findByRequestId(studentId: string, requestId: string) {
      return (
        rows.find(
          (item) => item.studentId === studentId && item.requestId === requestId,
        ) ?? null
      );
    },
  };
}

describe("commitStudyLog", () => {
  it("does not create a second row when the same submission is sent twice", async () => {
    const store = memoryStore();
    const first = await commitStudyLog(payload(), store);
    const second = await commitStudyLog(payload(), store);
    expect(first).toEqual({ status: "created", id: "id-1" });
    expect(second).toEqual({ status: "unchanged", id: "id-1" });
    expect(store.rows).toHaveLength(1);
  });

  it("refuses a different payload that reuses the request id", async () => {
    const store = memoryStore();
    await commitStudyLog(payload(), store);
    const conflict = await commitStudyLog(
      payload({ questionCount: 6, correctCount: 4 }),
      store,
    );
    expect(conflict).toEqual({ status: "conflict" });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.questionCount).toBe(5);
  });
});
