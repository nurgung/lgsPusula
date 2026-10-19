import { computeExamNets } from "./net-rules";
import type { ParsedExamInput } from "./schemas";

export type ExamSubjectRow = {
  subjectId: string;
  subjectCode: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  net: number;
};

export type ExamPayload = {
  studentId: string;
  title: string;
  takenOn: string;
  examType: ParsedExamInput["examType"];
  ruleVersion: ParsedExamInput["ruleVersion"];
  totalNet: number;
  requestId: string;
  subjects: ExamSubjectRow[];
};

export type StoredExam = ExamPayload & { id: string };

export type ExamCommitPorts = {
  insert: (row: ExamPayload) => Promise<StoredExam>;
  findByRequestId: (studentId: string, requestId: string) => Promise<StoredExam | null>;
};

function samePayload(a: ExamPayload, b: ExamPayload): boolean {
  if (
    a.studentId !== b.studentId ||
    a.title !== b.title ||
    a.takenOn !== b.takenOn ||
    a.examType !== b.examType ||
    a.ruleVersion !== b.ruleVersion ||
    a.totalNet !== b.totalNet ||
    a.requestId !== b.requestId ||
    a.subjects.length !== b.subjects.length
  ) {
    return false;
  }
  return a.subjects.every((subject, index) => {
    const other = b.subjects[index]!;
    return (
      subject.subjectId === other.subjectId &&
      subject.subjectCode === other.subjectCode &&
      subject.questionCount === other.questionCount &&
      subject.correctCount === other.correctCount &&
      subject.wrongCount === other.wrongCount &&
      subject.blankCount === other.blankCount &&
      subject.net === other.net
    );
  });
}

export function buildExamPayload(
  studentId: string,
  requestId: string,
  input: ParsedExamInput,
): ExamPayload {
  const nets = computeExamNets(
    input.examType,
    input.ruleVersion,
    input.subjects.map((subject) => ({
      subjectCode: subject.subjectCode,
      questionCount: subject.questionCount,
      correctCount: subject.correctCount,
      wrongCount: subject.wrongCount,
      blankCount: subject.blankCount,
    })),
  );
  const byCode = new Map(input.subjects.map((subject) => [subject.subjectCode, subject]));
  return {
    studentId,
    title: input.title,
    takenOn: input.takenOn,
    examType: input.examType,
    ruleVersion: input.ruleVersion,
    totalNet: nets.totalNet,
    requestId,
    subjects: nets.subjects.map((subject) => {
      const source = byCode.get(subject.subjectCode);
      if (!source) throw new Error(`missing subject ${subject.subjectCode}`);
      return {
        subjectId: source.subjectId,
        subjectCode: subject.subjectCode,
        questionCount: subject.questionCount,
        correctCount: subject.correctCount,
        wrongCount: subject.wrongCount,
        blankCount: subject.blankCount,
        net: subject.net,
      };
    }),
  };
}

/**
 * One submission id. A repeated post with the same content returns the existing row;
 * a different payload with the same id is a conflict.
 */
export async function commitExam(
  payload: ExamPayload,
  ports: ExamCommitPorts,
): Promise<{ status: "created" | "unchanged"; exam: StoredExam } | { status: "conflict" }> {
  const existing = await ports.findByRequestId(payload.studentId, payload.requestId);
  if (!existing) {
    const exam = await ports.insert(payload);
    return { status: "created", exam };
  }
  if (samePayload(existing, payload)) {
    return { status: "unchanged", exam: existing };
  }
  return { status: "conflict" };
}
