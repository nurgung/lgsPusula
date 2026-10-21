import type { AccessActor, ActiveStudentLink } from "@/features/access/student-access";
import { canReadStudentRecord } from "@/features/access/student-access";
import { isDownloadablePdf } from "./bytes";

/**
 * A weekly report is a parent action. The admin role does not add a student,
 * and a student cannot request the parent PDF (decision 0.13).
 */
export function canRequestReport(
  actor: AccessActor,
  studentId: string,
  activeLinks: readonly ActiveStudentLink[],
): boolean {
  if (!actor.roles.includes("parent")) return false;
  if (actor.roles.includes("student")) return false;
  return canReadStudentRecord(actor, studentId, activeLinks);
}

/**
 * Download requires the same parent, a still-active link, a ready unexpired file,
 * and bytes that pass the PDF check. A revoked link fails on the next request.
 */
export function canDownloadReport(input: {
  actor: AccessActor;
  requestedBy: string;
  studentId: string;
  status: "ready" | "failed";
  expiresAt: Date;
  bytes: Uint8Array | null;
  activeLinks: readonly ActiveStudentLink[];
  now: Date;
}): boolean {
  if (input.actor.id !== input.requestedBy) return false;
  if (!canRequestReport(input.actor, input.studentId, input.activeLinks)) return false;
  if (input.status !== "ready") return false;
  if (Number.isNaN(input.expiresAt.getTime())) return false;
  if (input.expiresAt.getTime() <= input.now.getTime()) return false;
  return isDownloadablePdf(input.bytes);
}
