// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";
import { rateLimitKey, retryAfterMinutes } from "./rate-limit";

describe("rateLimitKey", () => {
  it("is stable, scoped and does not contain the subject", () => {
    const key = rateLimitKey("login:ip", "203.0.113.7", "secret-a".repeat(4));
    expect(key).toBe(rateLimitKey("login:ip", "203.0.113.7", "secret-a".repeat(4)));
    expect(key).toMatch(/^login:ip:[0-9a-f]{64}$/);
    expect(key).not.toContain("203.0.113.7");
  });

  it("differs per scope and per secret", () => {
    const secret = "secret-a".repeat(4);
    expect(rateLimitKey("login:ip", "x", secret)).not.toBe(
      rateLimitKey("login:username", "x", secret).replace("login:username", "login:ip"),
    );
    expect(rateLimitKey("login:ip", "x", secret)).not.toBe(
      rateLimitKey("login:ip", "x", "secret-b".repeat(4)),
    );
  });
});

describe("retryAfterMinutes", () => {
  it.each([
    [1, 1],
    [60, 1],
    [61, 2],
    [900, 15],
    [0, 1],
  ])("%i s → %i dk", (seconds, minutes) => {
    expect(retryAfterMinutes(seconds)).toBe(minutes);
  });
});

describe("getClientIp", () => {
  const headers = (entries: Record<string, string>) => new Headers(entries);

  it("prefers x-real-ip", () => {
    expect(
      getClientIp(headers({ "x-real-ip": "198.51.100.2", "x-forwarded-for": "1.1.1.1" })),
    ).toBe("198.51.100.2");
  });

  it("uses the first x-forwarded-for entry", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to a shared bucket and caps length", () => {
    expect(getClientIp(headers({}))).toBe("unknown");
    expect(getClientIp(headers({ "x-real-ip": "a".repeat(500) }))).toHaveLength(64);
  });
});
