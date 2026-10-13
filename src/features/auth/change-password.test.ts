// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { attemptPasswordChange, type ChangePasswordDeps } from "./change-password";
import { RATE_LIMITS } from "./rate-limit";
import { FakeAuditLog, FakeRateLimiter } from "./testing/fakes";

const USER_ID = "00000000-0000-4000-8000-000000000002";

function setup(overrides: Partial<ChangePasswordDeps> = {}) {
  const rateLimiter = new FakeRateLimiter();
  const audit = new FakeAuditLog();
  const deps: ChangePasswordDeps = {
    rateLimiter,
    audit,
    rateLimitSecret: "test-secret-test-secret-test-secret",
    verifyPassword: vi.fn(
      async (_username: string, password: string) => password === "eski-parola-1",
    ),
    updatePassword: vi.fn(async () => ({ ok: true }) as const),
    signOutOtherSessions: vi.fn(async () => {}),
    clearMustChangePassword: vi.fn(async () => {}),
    ...overrides,
  };
  return { deps, rateLimiter, audit };
}

const input = (currentPassword: string) => ({
  userId: USER_ID,
  username: "ogrenci",
  currentPassword,
  newPassword: "yeni-parola-2",
});

describe("attemptPasswordChange", () => {
  it("updates the password, ends other sessions and clears the temporary-password flag", async () => {
    const { deps, audit } = setup();
    await expect(attemptPasswordChange(input("eski-parola-1"), deps)).resolves.toEqual({
      status: "success",
    });
    expect(deps.updatePassword).toHaveBeenCalledWith("yeni-parola-2");
    expect(deps.signOutOtherSessions).toHaveBeenCalledOnce();
    expect(deps.clearMustChangePassword).toHaveBeenCalledWith(USER_ID);
    expect(audit.events.at(-1)).toEqual({
      type: "auth.password_change",
      outcome: "success",
      actorId: USER_ID,
    });
  });

  it("rejects a wrong current password without changing anything", async () => {
    const { deps } = setup();
    await expect(attemptPasswordChange(input("yanlis"), deps)).resolves.toEqual({
      status: "invalid_current_password",
    });
    expect(deps.updatePassword).not.toHaveBeenCalled();
    expect(deps.clearMustChangePassword).not.toHaveBeenCalled();
  });

  it("limits guessing of the current password", async () => {
    const { deps } = setup();
    for (let i = 0; i < RATE_LIMITS.passwordChangeByUser.maxAttempts; i++) {
      await attemptPasswordChange(input("yanlis"), deps);
    }
    const result = await attemptPasswordChange(input("eski-parola-1"), deps);
    expect(result.status).toBe("rate_limited");
    expect(deps.verifyPassword).toHaveBeenCalledTimes(
      RATE_LIMITS.passwordChangeByUser.maxAttempts,
    );
  });

  it("keeps the temporary-password flag when the provider rejects the new password", async () => {
    const { deps, audit } = setup({
      updatePassword: vi.fn(
        async () => ({ ok: false, reason: "weak_password" }) as const,
      ),
    });
    await expect(attemptPasswordChange(input("eski-parola-1"), deps)).resolves.toEqual({
      status: "weak_password",
    });
    expect(deps.clearMustChangePassword).not.toHaveBeenCalled();
    expect(deps.signOutOtherSessions).not.toHaveBeenCalled();
    expect(audit.events.at(-1)).toMatchObject({
      outcome: "failure",
      metadata: { reason: "weak_password" },
    });
  });

  it("does not log passwords", async () => {
    const { deps, audit } = setup();
    await attemptPasswordChange(input("yanlis-gizli"), deps);
    await attemptPasswordChange(input("eski-parola-1"), deps);
    const logged = JSON.stringify(audit.events);
    expect(logged).not.toContain("yanlis-gizli");
    expect(logged).not.toContain("eski-parola-1");
    expect(logged).not.toContain("yeni-parola-2");
  });
});
