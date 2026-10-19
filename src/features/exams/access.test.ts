import { describe, expect, it } from "vitest";
import { canReadExam, canWriteExam } from "./access";

const student = { id: "s1", roles: ["student"] as const };
const parent = { id: "p1", roles: ["parent"] as const };
const owner = { id: "p1", roles: ["parent", "admin"] as const };
const otherStudent = { id: "s2", roles: ["student"] as const };
const active = [{ parentId: "p1", studentId: "s1" }];

describe("canWriteExam", () => {
  it("allows only a pure student role", () => {
    expect(canWriteExam(student)).toBe(true);
    expect(canWriteExam(parent)).toBe(false);
    expect(canWriteExam(owner)).toBe(false);
  });
});

describe("canReadExam", () => {
  it("allows the student and an active parent, not a stranger or admin alone", () => {
    expect(canReadExam(student, "s1", [])).toBe(true);
    expect(canReadExam(otherStudent, "s1", [])).toBe(false);
    expect(canReadExam(parent, "s1", active)).toBe(true);
    expect(canReadExam(parent, "s1", [])).toBe(false);
    expect(canReadExam(owner, "s1", active)).toBe(true);
    expect(canReadExam({ id: "a1", roles: ["admin"] }, "s1", [])).toBe(false);
  });
});
