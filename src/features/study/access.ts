import {
  canReadStudentRecord,
  type AccessActor,
  type ActiveStudentLink,
} from "@/features/access/student-access";

/**
 * Only the student account may create or change study logs and goals.
 * The id always comes from the session, never from the form.
 * A parent, including a parent who is also an admin, cannot write (decision 0.13).
 */
export function canWriteStudyRecord(actor: AccessActor): boolean {
  return actor.roles.length === 1 && actor.roles[0] === "student";
}

/** Same read rule as every other student record: self, or an active parent link. */
export function canReadStudyRecord(
  actor: AccessActor,
  studentId: string,
  activeLinks: readonly ActiveStudentLink[],
): boolean {
  return canReadStudentRecord(actor, studentId, activeLinks);
}
