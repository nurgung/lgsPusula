import {
  canReadStudentRecord,
  type AccessActor,
  type ActiveStudentLink,
} from "@/features/access/student-access";

/** Only the student account may create or change exam–outcome mappings. */
export function canWriteExamMistake(actor: AccessActor): boolean {
  return actor.roles.length === 1 && actor.roles[0] === "student";
}

/** Same read rule as exams: self, or an active parent link. */
export function canReadExamMistake(
  actor: AccessActor,
  studentId: string,
  activeLinks: readonly ActiveStudentLink[],
): boolean {
  return canReadStudentRecord(actor, studentId, activeLinks);
}
