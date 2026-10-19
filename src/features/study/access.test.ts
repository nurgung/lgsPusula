import { describe, expect, it } from "vitest";
import { canReadStudyRecord, canWriteStudyRecord } from "./access";

const student = { id: "student-a", roles: ["student"] as const };
const other = { id: "student-b", roles: ["student"] as const };
const parent = { id: "parent-a", roles: ["parent"] as const };
const owner = { id: "parent-admin", roles: ["parent", "admin"] as const };
const active = [{ studentId: "student-a", parentId: "parent-a" }];

describe("study record access", () => {
  it("lets only the student account write, and only their own id is used", () => {
    expect(canWriteStudyRecord(student)).toBe(true);
    expect(canWriteStudyRecord(parent)).toBe(false);
    expect(canWriteStudyRecord(owner)).toBe(false);
  });

  it("lets a student read only themselves and a parent read only an active link", () => {
    expect(canReadStudyRecord(student, "student-a", active)).toBe(true);
    expect(canReadStudyRecord(student, "student-b", active)).toBe(false);
    expect(canReadStudyRecord(other, "student-a", active)).toBe(false);
    expect(canReadStudyRecord(parent, "student-a", active)).toBe(true);
    expect(canReadStudyRecord(parent, "student-a", [])).toBe(false);
    expect(canReadStudyRecord(owner, "student-a", active)).toBe(false);
  });
});
