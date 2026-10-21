import {
  canReadStudentRecord,
  type AccessActor,
  type ActiveStudentLink,
} from "@/features/access/student-access";

/** Only the student account may choose a character or change reminder settings. */
export function canWriteMascot(actor: AccessActor): boolean {
  return actor.roles.length === 1 && actor.roles[0] === "student";
}

/** Same read rule as other student records. The admin role adds nothing. */
export function canReadMascot(
  actor: AccessActor,
  studentId: string,
  activeLinks: readonly ActiveStudentLink[],
): boolean {
  return canReadStudentRecord(actor, studentId, activeLinks);
}
