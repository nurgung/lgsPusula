import { describe, expect, it } from "vitest";
import { canReadMascot, canWriteMascot } from "./access";

const student = { id: "student-a", roles: ["student"] as const };
const other = { id: "student-b", roles: ["student"] as const };
const parent = { id: "parent-a", roles: ["parent"] as const };
const owner = { id: "parent-admin", roles: ["parent", "admin"] as const };
const active = [{ studentId: "student-a", parentId: "parent-a" }];

describe("mascot access", () => {
  it("lets only the student account write", () => {
    expect(canWriteMascot(student)).toBe(true);
    expect(canWriteMascot(parent)).toBe(false);
    expect(canWriteMascot(owner)).toBe(false);
  });

  it("lets a student read only themselves and a parent read only an active link", () => {
    expect(canReadMascot(student, "student-a", active)).toBe(true);
    expect(canReadMascot(student, "student-b", active)).toBe(false);
    expect(canReadMascot(other, "student-a", active)).toBe(false);
    expect(canReadMascot(parent, "student-a", active)).toBe(true);
    expect(canReadMascot(parent, "student-a", [])).toBe(false);
    expect(canReadMascot(owner, "student-a", active)).toBe(false);
  });
});
