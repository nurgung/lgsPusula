import type { UserRole } from "@/types/roles";

/** Who is asking, taken from the server session. Never from the client. */
export type AccessActor = {
  id: string;
  roles: readonly UserRole[];
};

export type ActiveStudentLink = {
  studentId: string;
  parentId: string;
};

/**
 * Whether this person may read the student record identified by `studentId`.
 * A student reads only their own record. A parent reads only a student they have an
 * active link with. The admin role does not add access (decision 0.13).
 */
export function canReadStudentRecord(
  actor: AccessActor,
  studentId: string,
  activeLinks: readonly ActiveStudentLink[],
): boolean {
  if (actor.roles.includes("student")) {
    return actor.roles.length === 1 && actor.id === studentId;
  }
  if (!actor.roles.includes("parent")) return false;
  return activeLinks.some(
    (link) => link.parentId === actor.id && link.studentId === studentId,
  );
}
