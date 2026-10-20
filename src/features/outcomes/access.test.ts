import { describe, expect, it } from "vitest";
import { canReadExamMistake, canWriteExamMistake } from "./access";

const student = { id: "s1", roles: ["student"] as const };
const parent = { id: "p1", roles: ["parent"] as const };
const adminParent = { id: "ap1", roles: ["parent", "admin"] as const };

describe("canWriteExamMistake", () => {
  it("allows only a pure student account", () => {
    expect(canWriteExamMistake(student)).toBe(true);
    expect(canWriteExamMistake(parent)).toBe(false);
    expect(canWriteExamMistake(adminParent)).toBe(false);
  });
});

describe("canReadExamMistake", () => {
  it("allows the student and an active parent link", () => {
    expect(canReadExamMistake(student, "s1", [])).toBe(true);
    expect(canReadExamMistake(student, "s2", [])).toBe(false);
    expect(canReadExamMistake(parent, "s1", [{ studentId: "s1", parentId: "p1" }])).toBe(
      true,
    );
    expect(canReadExamMistake(parent, "s1", [])).toBe(false);
    expect(
      canReadExamMistake(adminParent, "s1", [{ studentId: "s1", parentId: "ap1" }]),
    ).toBe(true);
    expect(canReadExamMistake(adminParent, "s2", [])).toBe(false);
  });
});
