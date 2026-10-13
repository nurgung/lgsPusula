import type { AuditLog, RateLimiter } from "./ports";
import { RATE_LIMITS, rateLimitKey } from "./rate-limit";

export type PasswordUpdateResult =
  | { ok: true }
  | { ok: false; reason: "weak_password" | "same_password" | "provider_error" };

export type ChangePasswordDeps = {
  rateLimiter: RateLimiter;
  audit: AuditLog;
  rateLimitSecret: string;
  /** Checks the current password without changing the caller's session. */
  verifyPassword: (username: string, password: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<PasswordUpdateResult>;
  /** Ends every session of the user except the current one. */
  signOutOtherSessions: () => Promise<void>;
  clearMustChangePassword: (userId: string) => Promise<void>;
};

export type ChangePasswordResult =
  | { status: "success" }
  | { status: "invalid_current_password" }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "weak_password" }
  | { status: "same_password" }
  | { status: "error" };

export async function attemptPasswordChange(
  input: {
    userId: string;
    username: string;
    currentPassword: string;
    newPassword: string;
  },
  deps: ChangePasswordDeps,
): Promise<ChangePasswordResult> {
  const key = rateLimitKey("password_change:user", input.userId, deps.rateLimitSecret);
  const decision = await deps.rateLimiter.consume(key, RATE_LIMITS.passwordChangeByUser);
  if (!decision.allowed) {
    await deps.audit.record({
      type: "auth.password_change",
      outcome: "blocked",
      actorId: input.userId,
      metadata: { reason: "rate_limited", rateLimitScope: "user" },
    });
    return { status: "rate_limited", retryAfterSeconds: decision.retryAfterSeconds };
  }

  if (!(await deps.verifyPassword(input.username, input.currentPassword))) {
    await deps.audit.record({
      type: "auth.password_change",
      outcome: "failure",
      actorId: input.userId,
      metadata: { reason: "invalid_current_password" },
    });
    return { status: "invalid_current_password" };
  }

  const update = await deps.updatePassword(input.newPassword);
  if (!update.ok) {
    await deps.audit.record({
      type: "auth.password_change",
      outcome: "failure",
      actorId: input.userId,
      metadata: {
        reason: update.reason === "provider_error" ? "provider_error" : "weak_password",
      },
    });
    return { status: update.reason === "provider_error" ? "error" : update.reason };
  }

  await deps.signOutOtherSessions();
  await deps.clearMustChangePassword(input.userId);
  await deps.rateLimiter.reset(key);
  await deps.audit.record({
    type: "auth.password_change",
    outcome: "success",
    actorId: input.userId,
  });
  return { status: "success" };
}
