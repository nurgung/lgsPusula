import { describe, expect, it } from "vitest";
import {
  generateInviteCode,
  hashInviteCode,
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
} from "./invite-code";

describe("invite codes", () => {
  it("draws 12 unambiguous characters, more than 50 bits, in three groups", () => {
    const code = generateInviteCode();
    expect(code).toMatch(
      /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/,
    );
    expect(code).not.toMatch(/[01OILiol]/);
    expect(normalizeInviteCode(code)).toHaveLength(INVITE_CODE_LENGTH);
    expect(Math.log2(31 ** INVITE_CODE_LENGTH)).toBeGreaterThan(50);
  });

  it("accepts the same code with spaces, dashes or lowercase", () => {
    expect(normalizeInviteCode("abcd efgh jkmn")).toBe("ABCDEFGHJKMN");
    expect(normalizeInviteCode("abcd-efgh-jkmn")).toBe("ABCDEFGHJKMN");
  });

  it("rejects codes that are short, long, or use confusing characters", () => {
    expect(normalizeInviteCode("ABCD")).toBeNull();
    expect(normalizeInviteCode("ABCDEFGHJKMN")).toBe("ABCDEFGHJKMN");
    expect(normalizeInviteCode("ABCD-EFGH-JKML")).toBeNull();
    expect(normalizeInviteCode("ABCD-EFGH-JKM0")).toBeNull();
  });

  it("stores a hash that does not contain the code", () => {
    const hash = hashInviteCode("ABCDEFGHJKMN", "test-secret");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("ABCD");
    expect(hashInviteCode("ABCDEFGHJKMN", "test-secret")).toBe(hash);
    expect(hashInviteCode("ABCDEFGHJKMN", "other-secret")).not.toBe(hash);
  });
});
