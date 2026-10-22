// Provider-independent contracts for the auth use cases. Implementations live in
// `src/services/supabase`; tests use in-memory fakes.

export type RateLimitPolicy = { maxAttempts: number; windowSeconds: number };
export type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number };

export interface RateLimiter {
  /** Counts one attempt for the bucket and reports whether it is still within the limit. */
  consume(bucketKey: string, policy: RateLimitPolicy): Promise<RateLimitDecision>;
  reset(bucketKey: string): Promise<void>;
}

export const AUDIT_EVENT_TYPES = [
  "auth.login",
  "auth.logout",
  "auth.logout_all",
  "auth.password_change",
  "auth.mfa_enroll",
  "auth.mfa_verify",
  "admin.account_create",
  "admin.password_reset",
  "admin.catalog_change",
  "admin.catalog_import",
  "family.invite_create",
  "family.invite_redeem",
  "family.link_respond",
  "family.link_revoke",
  "report.generate",
  "study.import",
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export type AuditOutcome = "success" | "failure" | "blocked";

/**
 * Closed set of fields so a caller cannot accidentally log a password, token, raw username or
 * IP address (SECURITY.md).
 */
export type AuditMetadata = {
  reason?:
    | "invalid_credentials"
    | "rate_limited"
    | "invalid_current_password"
    | "weak_password"
    | "provider_error"
    | "invalid_code"
    | "expired_code"
    | "already_linked"
    | "pending_exists"
    | "not_allowed"
    | "invalid_mfa_code"
    | "duplicate"
    | "not_found"
    | "generation_failed"
    | "empty_document";
  rateLimitScope?: "ip" | "username" | "user";
  catalogEntity?: "subject" | "topic" | "learning_outcome";
  catalogAction?: "create" | "update" | "archive" | "restore";
};

export type AuditEvent = {
  type: AuditEventType;
  outcome: AuditOutcome;
  actorId: string | null;
  metadata?: AuditMetadata;
};

export interface AuditLog {
  record(event: AuditEvent): Promise<void>;
}

export type CredentialResult =
  { ok: true; userId: string } | { ok: false; reason: "invalid_credentials" };
