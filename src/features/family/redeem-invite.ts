import type { AuditLog, AuditMetadata, RateLimiter } from "@/features/auth/ports";
import { RATE_LIMITS, rateLimitKey } from "@/features/auth/rate-limit";
import { hashInviteCode, normalizeInviteCode } from "./invite-code";

export const REDEEM_RESULTS = [
  "ok",
  "invalid",
  "expired",
  "not_parent",
  "self",
  "already_active",
  "pending_exists",
] as const;
export type RedeemResultCode = (typeof REDEEM_RESULTS)[number];

export type RedeemInviteDeps = {
  rateLimiter: RateLimiter;
  audit: AuditLog;
  rateLimitSecret: string;
  /** HMAC key for the stored invite hash; must match create. Defaults to rateLimitSecret. */
  inviteSecret?: string;
  redeem: (parentId: string, codeHash: string) => Promise<RedeemResultCode>;
};

export type RedeemInviteResult =
  | { status: "success" }
  | {
      status: "invalid" | "expired" | "already_active" | "pending_exists" | "not_allowed";
    }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "error" };

const REASONS: Partial<Record<RedeemResultCode, AuditMetadata["reason"]>> = {
  invalid: "invalid_code",
  expired: "expired_code",
  already_active: "already_linked",
  pending_exists: "pending_exists",
  not_parent: "not_allowed",
  self: "not_allowed",
};

export async function attemptRedeemInvite(
  input: { parentId: string; code: string; clientIp: string },
  deps: RedeemInviteDeps,
): Promise<RedeemInviteResult> {
  const ipKey = rateLimitKey("invite_redeem:ip", input.clientIp, deps.rateLimitSecret);
  const userKey = rateLimitKey(
    "invite_redeem:user",
    input.parentId,
    deps.rateLimitSecret,
  );
  const byIp = await deps.rateLimiter.consume(ipKey, RATE_LIMITS.inviteRedeemByIp);
  const byUser = byIp.allowed
    ? await deps.rateLimiter.consume(userKey, RATE_LIMITS.inviteRedeemByUser)
    : null;

  if (!byIp.allowed || (byUser && !byUser.allowed)) {
    await deps.audit.record({
      type: "family.invite_redeem",
      outcome: "blocked",
      actorId: input.parentId,
      metadata: {
        reason: "rate_limited",
        rateLimitScope: byIp.allowed ? "user" : "ip",
      },
    });
    return {
      status: "rate_limited",
      retryAfterSeconds: Math.max(byIp.retryAfterSeconds, byUser?.retryAfterSeconds ?? 0),
    };
  }

  const normalized = normalizeInviteCode(input.code);
  if (!normalized) {
    await deps.audit.record({
      type: "family.invite_redeem",
      outcome: "failure",
      actorId: input.parentId,
      metadata: { reason: "invalid_code" },
    });
    return { status: "invalid" };
  }

  let code: RedeemResultCode;
  try {
    code = await deps.redeem(
      input.parentId,
      hashInviteCode(normalized, deps.inviteSecret ?? deps.rateLimitSecret),
    );
  } catch {
    await deps.audit.record({
      type: "family.invite_redeem",
      outcome: "failure",
      actorId: input.parentId,
      metadata: { reason: "provider_error" },
    });
    return { status: "error" };
  }

  if (code === "ok") {
    await deps.audit.record({
      type: "family.invite_redeem",
      outcome: "success",
      actorId: input.parentId,
    });
    return { status: "success" };
  }

  await deps.audit.record({
    type: "family.invite_redeem",
    outcome: "failure",
    actorId: input.parentId,
    metadata: { reason: REASONS[code] ?? "invalid_code" },
  });

  if (code === "expired") return { status: "expired" };
  if (code === "already_active") return { status: "already_active" };
  if (code === "pending_exists") return { status: "pending_exists" };
  if (code === "not_parent" || code === "self") return { status: "not_allowed" };
  return { status: "invalid" };
}
