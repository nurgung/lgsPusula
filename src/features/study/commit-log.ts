/** Fields that identify one submission. A second submit with the same request id is not a new log. */
export type StudyLogPayload = {
  studentId: string;
  studiedOn: string;
  subjectId: string;
  topicId: string | null;
  outcomeId: string | null;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  durationMinutes: number;
  requestId: string;
};

export type StoredStudyLog = StudyLogPayload & { id: string };

export function sameStudyLogPayload(a: StudyLogPayload, b: StudyLogPayload): boolean {
  return (
    a.studentId === b.studentId &&
    a.studiedOn === b.studiedOn &&
    a.subjectId === b.subjectId &&
    a.topicId === b.topicId &&
    a.outcomeId === b.outcomeId &&
    a.questionCount === b.questionCount &&
    a.correctCount === b.correctCount &&
    a.wrongCount === b.wrongCount &&
    a.blankCount === b.blankCount &&
    a.durationMinutes === b.durationMinutes &&
    a.requestId === b.requestId
  );
}

export type CommitStudyLogResult =
  { status: "created" | "unchanged"; id: string } | { status: "conflict" };

/**
 * Inserts a log once per `(student, request id)`. The same payload again returns the
 * existing row. A different payload with that id is refused, so a double click cannot
 * create two rows and cannot silently overwrite the first one.
 */
export async function commitStudyLog(
  input: StudyLogPayload,
  store: {
    insert: (
      row: StudyLogPayload,
    ) => Promise<{ status: "created"; id: string } | { status: "exists" }>;
    findByRequestId: (
      studentId: string,
      requestId: string,
    ) => Promise<StoredStudyLog | null>;
  },
): Promise<CommitStudyLogResult> {
  const inserted = await store.insert(input);
  if (inserted.status === "created") return { status: "created", id: inserted.id };

  const existing = await store.findByRequestId(input.studentId, input.requestId);
  if (existing && sameStudyLogPayload(existing, input)) {
    return { status: "unchanged", id: existing.id };
  }
  return { status: "conflict" };
}
