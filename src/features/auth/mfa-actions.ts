"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AuthProviderError,
  createAuditLog,
  createRateLimiter,
} from "@/services/supabase/auth-adapters";
import { getSupabaseConfig } from "@/services/supabase/config";
import {
  createServiceClient,
  createSessionClient,
} from "@/services/supabase/server-client";
import { AUTH_MESSAGES } from "./form-state";
import { ADMIN_HOME_PATH } from "./paths";
import { RATE_LIMITS, rateLimitKey, retryAfterMinutes } from "./rate-limit";
import { requireUser } from "./session";
import type { MfaEnrollState, MfaVerifyState } from "./mfa-state";

const codeSchema = z.object({
  factorId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, AUTH_MESSAGES.mfaCodeRequired),
});

async function requireAdminAccount() {
  const user = await requireUser();
  if (!user.roles.includes("admin")) return null;
  return user;
}

export async function enrollMfaAction(
  previous: MfaEnrollState,
  formData: FormData,
): Promise<MfaEnrollState> {
  void previous;
  void formData;
  const user = await requireAdminAccount();
  if (!user) return { status: "error", message: AUTH_MESSAGES.notAllowed };
  if (!getSupabaseConfig())
    return { status: "error", message: AUTH_MESSAGES.providerError };

  try {
    const session = await createSessionClient({ writable: true });
    const listed = await session.auth.mfa.listFactors();
    if (listed.error) throw new AuthProviderError("mfa_list");
    if (listed.data.totp.some((factor) => factor.status === "verified")) {
      return { status: "error", message: AUTH_MESSAGES.mfaAlreadyEnrolled };
    }
    for (const factor of listed.data.all) {
      if (factor.status === "verified") continue;
      const removed = await session.auth.mfa.unenroll({ factorId: factor.id });
      if (removed.error) throw new AuthProviderError("mfa_unenroll");
    }

    const enrolled = await session.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "LGS Pusula",
      issuer: "LGS Pusula",
    });
    if (enrolled.error || !enrolled.data.totp) {
      console.error("mfa_enroll failed", { code: enrolled.error?.code });
      throw new AuthProviderError("mfa_enroll");
    }

    await createAuditLog(createServiceClient()).record({
      type: "auth.mfa_enroll",
      outcome: "success",
      actorId: user.id,
    });

    return {
      status: "ready",
      factorId: enrolled.data.id,
      secret: enrolled.data.totp.secret,
    };
  } catch (error) {
    if (!(error instanceof AuthProviderError)) throw error;
    console.error(error.message);
    return { status: "error", message: AUTH_MESSAGES.providerError };
  }
}

export async function verifyMfaAction(
  _previous: MfaVerifyState,
  formData: FormData,
): Promise<MfaVerifyState> {
  const user = await requireAdminAccount();
  if (!user) return { status: "error", message: AUTH_MESSAGES.notAllowed };
  const config = getSupabaseConfig();
  if (!config) return { status: "error", message: AUTH_MESSAGES.providerError };

  const rawCode = String(formData.get("code") ?? "").replace(/\s/g, "");
  const parsed = codeSchema.safeParse({
    factorId: formData.get("factorId"),
    code: rawCode,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: AUTH_MESSAGES.formInvalid,
      fieldErrors: { code: AUTH_MESSAGES.mfaCodeRequired },
    };
  }

  const service = createServiceClient();
  const limiter = createRateLimiter(service);
  const audit = createAuditLog(service);
  const key = rateLimitKey("mfa_verify:user", user.id, config.authSecret);

  try {
    const decision = await limiter.consume(key, RATE_LIMITS.mfaVerifyByUser);
    if (!decision.allowed) {
      await audit.record({
        type: "auth.mfa_verify",
        outcome: "blocked",
        actorId: user.id,
        metadata: { reason: "rate_limited", rateLimitScope: "user" },
      });
      return {
        status: "error",
        message: AUTH_MESSAGES.rateLimited(retryAfterMinutes(decision.retryAfterSeconds)),
      };
    }

    const session = await createSessionClient({ writable: true });
    const challenge = await session.auth.mfa.challenge({
      factorId: parsed.data.factorId,
    });
    if (challenge.error || !challenge.data) throw new AuthProviderError("mfa_challenge");

    const verified = await session.auth.mfa.verify({
      factorId: parsed.data.factorId,
      challengeId: challenge.data.id,
      code: parsed.data.code,
    });
    if (verified.error) {
      await audit.record({
        type: "auth.mfa_verify",
        outcome: "failure",
        actorId: user.id,
        metadata: { reason: "invalid_mfa_code" },
      });
      return { status: "error", message: AUTH_MESSAGES.mfaCodeInvalid };
    }
  } catch (error) {
    if (!(error instanceof AuthProviderError)) throw error;
    console.error(error.message);
    return { status: "error", message: AUTH_MESSAGES.providerError };
  }

  await audit.record({
    type: "auth.mfa_verify",
    outcome: "success",
    actorId: user.id,
  });
  redirect(ADMIN_HOME_PATH);
}
