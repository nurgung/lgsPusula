// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { attemptLogin, type LoginDeps } from "./login";
import { RATE_LIMITS } from "./rate-limit";
import { FakeAuditLog, FakeRateLimiter } from "./testing/fakes";

const SECRET = "test-secret-test-secret-test-secret";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function setup(overrides: Partial<LoginDeps> = {}) {
  const rateLimiter = new FakeRateLimiter();
  const audit = new FakeAuditLog();
  const deps: LoginDeps = {
    rateLimiter,
    audit,
    rateLimitSecret: SECRET,
    signIn: vi.fn(async (_username: string, password: string) =>
      password === "dogru-parola-1"
        ? ({ ok: true, userId: USER_ID } as const)
        : ({ ok: false, reason: "invalid_credentials" } as const),
    ),
    findUserIdByUsername: vi.fn(async (username: string) =>
      username === "ogrenci" ? USER_ID : null,
    ),
    ...overrides,
  };
  return { deps, rateLimiter, audit };
}

const input = (password: string, username = "ogrenci", clientIp = "203.0.113.7") => ({
  username,
  password,
  clientIp,
});

describe("attemptLogin", () => {
  it("signs in with correct credentials and clears the username counter", async () => {
    const { deps, rateLimiter, audit } = setup();
    await expect(attemptLogin(input("dogru-parola-1"), deps)).resolves.toEqual({
      status: "success",
      userId: USER_ID,
    });
    expect(rateLimiter.resets).toHaveLength(1);
    expect(rateLimiter.resets[0]).toMatch(/^login:username:/);
    expect(audit.events).toEqual([
      { type: "auth.login", outcome: "success", actorId: USER_ID },
    ]);
  });

  it("gives the same answer for an unknown user and a wrong password", async () => {
    const { deps } = setup();
    const wrongPassword = await attemptLogin(input("yanlis"), deps);
    const unknownUser = await attemptLogin(input("yanlis", "kimse_yok"), deps);
    expect(wrongPassword).toEqual({ status: "invalid_credentials" });
    expect(unknownUser).toEqual(wrongPassword);
  });

  it("blocks a username after too many attempts, even with the right password", async () => {
    const { deps, audit } = setup();
    for (let i = 0; i < RATE_LIMITS.loginByUsername.maxAttempts; i++) {
      await attemptLogin(input("yanlis"), deps);
    }
    const result = await attemptLogin(input("dogru-parola-1"), deps);
    expect(result).toEqual({
      status: "rate_limited",
      retryAfterSeconds: RATE_LIMITS.loginByUsername.windowSeconds,
    });
    expect(deps.signIn).toHaveBeenCalledTimes(RATE_LIMITS.loginByUsername.maxAttempts);
    expect(audit.events.at(-1)).toMatchObject({
      outcome: "blocked",
      actorId: USER_ID,
      metadata: { reason: "rate_limited", rateLimitScope: "username" },
    });
  });

  it("blocks an IP that tries many usernames", async () => {
    const { deps } = setup();
    for (let i = 0; i < RATE_LIMITS.loginByIp.maxAttempts; i++) {
      await attemptLogin(input("yanlis", `kullanici_${i}`), deps);
    }
    const result = await attemptLogin(input("dogru-parola-1"), deps);
    expect(result.status).toBe("rate_limited");
  });

  it("keeps other IPs and usernames unaffected", async () => {
    const { deps } = setup();
    for (let i = 0; i < RATE_LIMITS.loginByUsername.maxAttempts + 1; i++) {
      await attemptLogin(input("yanlis", "baskasi"), deps);
    }
    const result = await attemptLogin(
      input("dogru-parola-1", "ogrenci", "198.51.100.1"),
      deps,
    );
    expect(result.status).toBe("success");
  });

  it("never puts the password, username or IP into rate-limit keys or audit events", async () => {
    const { deps, rateLimiter, audit } = setup();
    await attemptLogin(input("yanlis-gizli-parola"), deps);
    const stored = JSON.stringify([...rateLimiter.counts.keys(), audit.events]);
    expect(stored).not.toContain("yanlis-gizli-parola");
    expect(stored).not.toContain("ogrenci");
    expect(stored).not.toContain("203.0.113.7");
  });
});
