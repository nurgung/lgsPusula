import type { AuditLog, RateLimiter } from "@/features/auth/ports";
import { RATE_LIMITS, rateLimitKey } from "@/features/auth/rate-limit";
import { generateInviteCode, hashInviteCode, INVITE_CODE_TTL_MS } from "./invite-code";

export type CreateInviteDeps = {
  rateLimiter: RateLimiter;
  audit: AuditLog;
  rateLimitSecret: string;
  now: Date;
  /** Persists the hash. The plaintext code stays in the use-case result only. */
  createInvite: (studentId: string, codeHash: string, expiresAt: Date) => Promise<void>;
  generateCode?: () => string;
};

export type CreateInviteResult =
  | { status: "success"; code: string }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "error" };

export async function attemptCreateInvite(
  input: { studentId: string },
  deps: CreateInviteDeps,
): Promise<CreateInviteResult> {
  const key = rateLimitKey("invite_create:user", input.studentId, deps.rateLimitSecret);
  const decision = await deps.rateLimiter.consume(key, RATE_LIMITS.inviteCreateByUser);
  if (!decision.allowed) {
    await deps.audit.record({
      type: "family.invite_create",
      outcome: "blocked",
      actorId: input.studentId,
      metadata: { reason: "rate_limited", rateLimitScope: "user" },
    });
    return { status: "rate_limited", retryAfterSeconds: decision.retryAfterSeconds };
  }

  const code = (deps.generateCode ?? generateInviteCode)();
  const normalized = code.replace(/-/g, "");
  try {
    await deps.createInvite(
      input.studentId,
      hashInviteCode(normalized, deps.rateLimitSecret),
      new Date(deps.now.getTime() + INVITE_CODE_TTL_MS),
    );
  } catch {
    await deps.audit.record({
      type: "family.invite_create",
      outcome: "failure",
      actorId: input.studentId,
      metadata: { reason: "provider_error" },
    });
    return { status: "error" };
  }

  await deps.audit.record({
    type: "family.invite_create",
    outcome: "success",
    actorId: input.studentId,
  });
  return { status: "success", code };
}
