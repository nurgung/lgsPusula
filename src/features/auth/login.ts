import type { AuditLog, CredentialResult, RateLimiter } from "./ports";
import { RATE_LIMITS, rateLimitKey } from "./rate-limit";
import type { LoginInput } from "./schemas";

export type LoginDeps = {
  rateLimiter: RateLimiter;
  audit: AuditLog;
  rateLimitSecret: string;
  /** Starts the session on success (sets the session cookies). */
  signIn: (username: string, password: string) => Promise<CredentialResult>;
  /** Used only to attribute failed attempts in the audit log; never shown to the user. */
  findUserIdByUsername: (username: string) => Promise<string | null>;
};

export type LoginResult =
  | { status: "success"; userId: string }
  | { status: "invalid_credentials" }
  | { status: "rate_limited"; retryAfterSeconds: number };

export async function attemptLogin(
  input: LoginInput & { clientIp: string },
  deps: LoginDeps,
): Promise<LoginResult> {
  const ipKey = rateLimitKey("login:ip", input.clientIp, deps.rateLimitSecret);
  const usernameKey = rateLimitKey(
    "login:username",
    input.username,
    deps.rateLimitSecret,
  );

  const byIp = await deps.rateLimiter.consume(ipKey, RATE_LIMITS.loginByIp);
  const byUsername = byIp.allowed
    ? await deps.rateLimiter.consume(usernameKey, RATE_LIMITS.loginByUsername)
    : null;

  if (!byIp.allowed || (byUsername && !byUsername.allowed)) {
    await deps.audit.record({
      type: "auth.login",
      outcome: "blocked",
      actorId: await deps.findUserIdByUsername(input.username),
      metadata: {
        reason: "rate_limited",
        rateLimitScope: byIp.allowed ? "username" : "ip",
      },
    });
    return {
      status: "rate_limited",
      retryAfterSeconds: Math.max(
        byIp.retryAfterSeconds,
        byUsername?.retryAfterSeconds ?? 0,
      ),
    };
  }

  const result = await deps.signIn(input.username, input.password);
  if (!result.ok) {
    await deps.audit.record({
      type: "auth.login",
      outcome: "failure",
      actorId: await deps.findUserIdByUsername(input.username),
      metadata: { reason: "invalid_credentials" },
    });
    // Same answer for unknown usernames and wrong passwords: no account enumeration.
    return { status: "invalid_credentials" };
  }

  await deps.rateLimiter.reset(usernameKey);
  await deps.audit.record({
    type: "auth.login",
    outcome: "success",
    actorId: result.userId,
  });
  return { status: "success", userId: result.userId };
}
