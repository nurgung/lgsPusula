import { createHmac } from "node:crypto";
import type { RateLimitPolicy } from "./ports";

export const RATE_LIMITS = {
  loginByIp: { maxAttempts: 20, windowSeconds: 15 * 60 },
  loginByUsername: { maxAttempts: 5, windowSeconds: 15 * 60 },
  passwordChangeByUser: { maxAttempts: 5, windowSeconds: 15 * 60 },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitScope = "login:ip" | "login:username" | "password_change:user";

/** The subject (IP, username, user id) is stored only as an HMAC, never in plain text. */
export function rateLimitKey(
  scope: RateLimitScope,
  subject: string,
  secret: string,
): string {
  const digest = createHmac("sha256", secret)
    .update(`${scope}\u0000${subject}`)
    .digest("hex");
  return `${scope}:${digest}`;
}

/** Whole minutes for user-facing messages; never shows "0 dakika". */
export function retryAfterMinutes(retryAfterSeconds: number): number {
  return Math.max(1, Math.ceil(retryAfterSeconds / 60));
}
