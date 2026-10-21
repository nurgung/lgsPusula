import { describe, expect, it } from "vitest";
import type { AccessActor } from "@/features/access/student-access";
import { canDownloadReport, canRequestReport } from "./access";
import { MIN_PDF_BYTES } from "./constants";

const parent: AccessActor = { id: "p1", roles: ["parent"] };
const adminParent: AccessActor = { id: "p1", roles: ["parent", "admin"] };
const adminOnly: AccessActor = { id: "a1", roles: ["admin"] };
const student: AccessActor = { id: "s1", roles: ["student"] };
const otherParent: AccessActor = { id: "p2", roles: ["parent"] };
const active = [{ parentId: "p1", studentId: "s1" }];
const future = new Date("2026-10-22T10:00:00.000Z");
const now = new Date("2026-10-21T10:00:00.000Z");

function pdfBytes(): Uint8Array {
  const bytes = new Uint8Array(MIN_PDF_BYTES);
  bytes.set(new TextEncoder().encode("%PDF-"));
  return bytes;
}

describe("canRequestReport", () => {
  it("allows the linked parent, including a parent who is also an admin", () => {
    expect(canRequestReport(parent, "s1", active)).toBe(true);
    expect(canRequestReport(adminParent, "s1", active)).toBe(true);
  });

  it("rejects a stranger, a student, and an admin without a parent link", () => {
    expect(canRequestReport(otherParent, "s1", active)).toBe(false);
    expect(canRequestReport(parent, "s1", [])).toBe(false);
    expect(canRequestReport(student, "s1", active)).toBe(false);
    expect(canRequestReport(adminOnly, "s1", active)).toBe(false);
  });
});

describe("canDownloadReport", () => {
  const base = {
    actor: parent,
    requestedBy: "p1",
    studentId: "s1",
    status: "ready" as const,
    expiresAt: future,
    bytes: pdfBytes(),
    activeLinks: active,
    now,
  };

  it("allows the requester while the link is active and the file is a PDF", () => {
    expect(canDownloadReport(base)).toBe(true);
    expect(canDownloadReport({ ...base, actor: adminParent })).toBe(true);
  });

  it("rejects another parent, a revoked link, a failed or expired or empty file", () => {
    expect(canDownloadReport({ ...base, actor: otherParent, requestedBy: "p2" })).toBe(
      false,
    );
    expect(canDownloadReport({ ...base, activeLinks: [] })).toBe(false);
    expect(canDownloadReport({ ...base, status: "failed", bytes: null })).toBe(false);
    expect(
      canDownloadReport({ ...base, expiresAt: new Date("2026-10-21T09:00:00.000Z") }),
    ).toBe(false);
    expect(canDownloadReport({ ...base, bytes: new Uint8Array() })).toBe(false);
    expect(
      canDownloadReport({ ...base, bytes: new TextEncoder().encode("%PDF-short") }),
    ).toBe(false);
    expect(canDownloadReport({ ...base, actor: student, requestedBy: "s1" })).toBe(false);
  });
});
