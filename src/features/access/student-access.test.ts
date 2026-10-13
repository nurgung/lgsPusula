import { describe, expect, it } from "vitest";
import { canReadStudentRecord, type AccessActor } from "./student-access";

const studentA: AccessActor = { id: "student-a", roles: ["student"] };
const studentB: AccessActor = { id: "student-b", roles: ["student"] };
const parentA: AccessActor = { id: "parent-a", roles: ["parent"] };
const owner: AccessActor = { id: "parent-a", roles: ["parent", "admin"] };
const stranger: AccessActor = { id: "parent-b", roles: ["parent", "admin"] };

const active = [{ studentId: "student-a", parentId: "parent-a" }];

describe("canReadStudentRecord", () => {
  it("lets a student read only their own record", () => {
    expect(canReadStudentRecord(studentA, "student-a", active)).toBe(true);
    expect(canReadStudentRecord(studentA, "student-b", active)).toBe(false);
    expect(canReadStudentRecord(studentB, "student-a", active)).toBe(false);
  });

  it("lets a parent read a student only while the link is active", () => {
    expect(canReadStudentRecord(parentA, "student-a", active)).toBe(true);
    expect(canReadStudentRecord(parentA, "student-a", [])).toBe(false);
    expect(canReadStudentRecord(parentA, "student-b", active)).toBe(false);
  });

  it("does not give the admin role any extra student access", () => {
    expect(canReadStudentRecord(owner, "student-a", active)).toBe(true);
    expect(canReadStudentRecord(owner, "student-b", active)).toBe(false);
    expect(canReadStudentRecord(stranger, "student-a", active)).toBe(false);
    expect(canReadStudentRecord(stranger, "student-a", [])).toBe(false);
  });

  it("ignores a link that belongs to a different parent", () => {
    expect(
      canReadStudentRecord(parentA, "student-a", [
        { studentId: "student-a", parentId: "someone-else" },
      ]),
    ).toBe(false);
  });
});
