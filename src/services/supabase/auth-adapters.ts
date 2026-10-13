import "server-only";
import { isAuthApiError, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  AuditEvent,
  AuditLog,
  CredentialResult,
  RateLimitDecision,
  RateLimiter,
} from "@/features/auth/ports";
import type { PasswordUpdateResult } from "@/features/auth/change-password";
import { usernameToAuthEmail } from "@/features/auth/username";
import { createEphemeralAuthClient } from "./server-client";

const rateLimitRowSchema = z.object({
  allowed: z.boolean(),
  retry_after_seconds: z.number().int().nonnegative(),
});

export class AuthProviderError extends Error {
  constructor(operation: string) {
    // Operation name only; provider messages may echo user input.
    super(`Auth provider operation failed: ${operation}`);
    this.name = "AuthProviderError";
  }
}

export function createRateLimiter(service: SupabaseClient): RateLimiter {
  return {
    async consume(bucketKey, policy): Promise<RateLimitDecision> {
      const { data, error } = await service.rpc("consume_rate_limit", {
        p_bucket_key: bucketKey,
        p_max_attempts: policy.maxAttempts,
        p_window_seconds: policy.windowSeconds,
      });
      // Fail closed: if the limiter is unavailable, the attempt is not allowed through.
      if (error) throw new AuthProviderError("consume_rate_limit");
      const row = rateLimitRowSchema.parse(Array.isArray(data) ? data[0] : data);
      return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds };
    },
    async reset(bucketKey) {
      const { error } = await service.rpc("reset_rate_limit", {
        p_bucket_key: bucketKey,
      });
      if (error) throw new AuthProviderError("reset_rate_limit");
    },
  };
}

export function createAuditLog(service: SupabaseClient): AuditLog {
  return {
    async record(event: AuditEvent) {
      const { error } = await service.from("audit_events").insert({
        event_type: event.type,
        outcome: event.outcome,
        actor_id: event.actorId,
        metadata: event.metadata ?? {},
      });
      if (error) {
        // A missing audit row must not lock the family out, but it must be visible in logs.
        console.error("audit_events insert failed", {
          type: event.type,
          code: error.code,
        });
      }
    },
  };
}

export async function findUserIdByUsername(
  service: SupabaseClient,
  username: string,
): Promise<string | null> {
  const { data, error } = await service
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle<{ id: string }>();
  if (error) throw new AuthProviderError("find_profile");
  return data?.id ?? null;
}

/** Signs in on the cookie-bound client so the session cookies are written on success. */
export async function signInWithUsername(
  session: SupabaseClient,
  username: string,
  password: string,
): Promise<CredentialResult> {
  const { data, error } = await session.auth.signInWithPassword({
    email: usernameToAuthEmail(username),
    password,
  });
  if (error) {
    if (isAuthApiError(error) && error.status === 400) {
      return { ok: false, reason: "invalid_credentials" };
    }
    throw new AuthProviderError("sign_in");
  }
  return { ok: true, userId: data.user.id };
}

/** Verifies a password on a throwaway client and immediately ends that extra session. */
export async function verifyPassword(
  username: string,
  password: string,
): Promise<boolean> {
  const client = createEphemeralAuthClient();
  const { error } = await client.auth.signInWithPassword({
    email: usernameToAuthEmail(username),
    password,
  });
  if (error) {
    if (isAuthApiError(error) && error.status === 400) return false;
    throw new AuthProviderError("verify_password");
  }
  await client.auth.signOut({ scope: "local" });
  return true;
}

export async function updatePassword(
  session: SupabaseClient,
  newPassword: string,
): Promise<PasswordUpdateResult> {
  const { error } = await session.auth.updateUser({ password: newPassword });
  if (!error) return { ok: true };
  if (error.code === "weak_password") return { ok: false, reason: "weak_password" };
  if (error.code === "same_password") return { ok: false, reason: "same_password" };
  return { ok: false, reason: "provider_error" };
}

export async function clearMustChangePassword(service: SupabaseClient, userId: string) {
  const { error } = await service
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", userId);
  if (error) throw new AuthProviderError("clear_must_change_password");
}
