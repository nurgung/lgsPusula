// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  generateTemporaryPassword,
  validateRoles,
} from "../../scripts/lib/account-admin.ts";
import { passwordPolicySchema } from "@/features/auth/schemas";

describe("generateTemporaryPassword", () => {
  it("meets the password policy and avoids look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const password = generateTemporaryPassword();
      expect(password).toMatch(/^[a-zA-Z2-9]{4}(-[a-zA-Z2-9]{4}){3}$/);
      expect(password).not.toMatch(/[01OlI]/);
      expect(passwordPolicySchema.safeParse(password).success).toBe(true);
    }
  });

  it("does not repeat", () => {
    const passwords = new Set(Array.from({ length: 100 }, generateTemporaryPassword));
    expect(passwords.size).toBe(100);
  });
});

describe("validateRoles", () => {
  it("accepts the two family account shapes (decision 0.13)", () => {
    expect(() => validateRoles(["student"])).not.toThrow();
    expect(() => validateRoles(["parent", "admin"])).not.toThrow();
    expect(() => validateRoles(["parent"])).not.toThrow();
  });

  it("rejects role escalation shapes", () => {
    expect(() => validateRoles([])).toThrow();
    expect(() => validateRoles(["student", "admin"])).toThrow();
    expect(() => validateRoles(["student", "parent"])).toThrow();
    expect(() => validateRoles(["admin"])).toThrow();
  });
});
