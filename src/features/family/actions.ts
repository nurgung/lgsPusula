"use server";

import { headers } from "next/headers";
import {
  AuthProviderError,
  createAuditLog,
  createRateLimiter,
} from "@/services/supabase/auth-adapters";
import {
  expireStaleFamilyLinks,
  insertFamilyInvite,
  redeemFamilyInvite,
  respondFamilyLink,
  revokeFamilyLink,
} from "@/services/supabase/family-store";
import { createServiceClient } from "@/services/supabase/server-client";
import { getSupabaseConfig } from "@/services/supabase/config";
import { requireParent } from "@/features/access/guards";
import { retryAfterMinutes } from "@/features/auth/rate-limit";
import { fieldErrorsFrom } from "@/features/auth/schemas";
import { getClientIp } from "@/features/auth/client-ip";
import { requireUser } from "@/features/auth/session";
import { attemptCreateInvite } from "./create-invite";
import type { FamilyFormState } from "./form-state";
import { FAMILY_MESSAGES } from "./messages";
import { attemptRedeemInvite } from "./redeem-invite";
import { inviteCodeSchema, linkIdSchema, respondLinkSchema } from "./schemas";

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

function providerFailure(error: unknown): FamilyFormState {
  if (!(error instanceof AuthProviderError)) throw error;
  console.error(error.message);
  return { status: "error", message: FAMILY_MESSAGES.providerError };
}

export async function createInviteAction(
  previous: FamilyFormState,
  formData: FormData,
): Promise<FamilyFormState> {
  void previous;
  void formData;
  const user = await requireUser();
  if (!(user.roles.length === 1 && user.roles[0] === "student")) {
    return { status: "error", message: FAMILY_MESSAGES.notAllowed };
  }
  const config = getSupabaseConfig();
  if (!config) return { status: "error", message: FAMILY_MESSAGES.providerError };

  try {
    const service = createServiceClient();
    const result = await attemptCreateInvite(
      { studentId: user.id },
      {
        rateLimiter: createRateLimiter(service),
        audit: createAuditLog(service),
        rateLimitSecret: config.authSecret,
        now: new Date(),
        createInvite: (studentId, codeHash, expiresAt) =>
          insertFamilyInvite(service, studentId, codeHash, expiresAt),
      },
    );
    if (result.status === "rate_limited") {
      return {
        status: "error",
        message: FAMILY_MESSAGES.rateLimited(retryAfterMinutes(result.retryAfterSeconds)),
      };
    }
    if (result.status === "error") {
      return { status: "error", message: FAMILY_MESSAGES.providerError };
    }
    return { status: "success", message: "Kodun hazır.", code: result.code };
  } catch (error) {
    return providerFailure(error);
  }
}

export async function redeemInviteAction(
  _previous: FamilyFormState,
  formData: FormData,
): Promise<FamilyFormState> {
  const user = await requireParent();
  const config = getSupabaseConfig();
  if (!config) return { status: "error", message: FAMILY_MESSAGES.providerError };

  const rawCode = text(formData, "code");
  const parsed = inviteCodeSchema.safeParse({ code: rawCode });
  if (!parsed.success) {
    return {
      status: "error",
      message: FAMILY_MESSAGES.formInvalid,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { code: rawCode.slice(0, 40) },
    };
  }

  try {
    const service = createServiceClient();
    await expireStaleFamilyLinks(service);
    const result = await attemptRedeemInvite(
      {
        parentId: user.id,
        code: parsed.data.code,
        clientIp: getClientIp(await headers()),
      },
      {
        rateLimiter: createRateLimiter(service),
        audit: createAuditLog(service),
        rateLimitSecret: config.authSecret,
        redeem: (parentId, codeHash) => redeemFamilyInvite(service, parentId, codeHash),
      },
    );
    switch (result.status) {
      case "success":
        return {
          status: "success",
          message: "İstek öğrenciye iletildi. Onayını bekliyorsun.",
        };
      case "rate_limited":
        return {
          status: "error",
          message: FAMILY_MESSAGES.rateLimited(
            retryAfterMinutes(result.retryAfterSeconds),
          ),
          values: { code: parsed.data.code },
        };
      case "expired":
        return {
          status: "error",
          message: FAMILY_MESSAGES.codeExpired,
          values: { code: parsed.data.code },
        };
      case "already_active":
        return { status: "error", message: FAMILY_MESSAGES.alreadyLinked };
      case "pending_exists":
        return { status: "error", message: FAMILY_MESSAGES.pendingExists };
      case "not_allowed":
        return { status: "error", message: FAMILY_MESSAGES.notAllowed };
      case "error":
        return { status: "error", message: FAMILY_MESSAGES.providerError };
      case "invalid":
        return {
          status: "error",
          message: FAMILY_MESSAGES.codeInvalid,
          values: { code: parsed.data.code },
        };
    }
  } catch (error) {
    return providerFailure(error);
  }
}

export async function respondLinkAction(
  _previous: FamilyFormState,
  formData: FormData,
): Promise<FamilyFormState> {
  const user = await requireUser();
  if (!(user.roles.length === 1 && user.roles[0] === "student")) {
    return { status: "error", message: FAMILY_MESSAGES.notAllowed };
  }
  const parsed = respondLinkSchema.safeParse({
    linkId: text(formData, "linkId"),
    decision: text(formData, "decision"),
  });
  if (!parsed.success) return { status: "error", message: FAMILY_MESSAGES.linkMissing };

  try {
    const service = createServiceClient();
    await expireStaleFamilyLinks(service);
    const result = await respondFamilyLink(
      service,
      user.id,
      parsed.data.linkId,
      parsed.data.decision,
    );
    const audit = createAuditLog(service);
    if (result === "ok") {
      await audit.record({
        type: "family.link_respond",
        outcome: "success",
        actorId: user.id,
      });
      return {
        status: "success",
        message:
          parsed.data.decision === "approve"
            ? FAMILY_MESSAGES.approved
            : FAMILY_MESSAGES.declined,
      };
    }
    await audit.record({
      type: "family.link_respond",
      outcome: "failure",
      actorId: user.id,
      metadata: {
        reason:
          result === "expired"
            ? "expired_code"
            : result === "already_active"
              ? "already_linked"
              : "not_allowed",
      },
    });
    if (result === "expired")
      return { status: "error", message: FAMILY_MESSAGES.linkExpired };
    if (result === "already_active") {
      return { status: "error", message: FAMILY_MESSAGES.alreadyLinked };
    }
    return { status: "error", message: FAMILY_MESSAGES.linkMissing };
  } catch (error) {
    return providerFailure(error);
  }
}

export async function revokeLinkAction(
  _previous: FamilyFormState,
  formData: FormData,
): Promise<FamilyFormState> {
  const user = await requireUser();
  const parsed = linkIdSchema.safeParse({ linkId: text(formData, "linkId") });
  if (!parsed.success) return { status: "error", message: FAMILY_MESSAGES.linkMissing };

  try {
    const service = createServiceClient();
    const result = await revokeFamilyLink(service, user.id, parsed.data.linkId);
    const audit = createAuditLog(service);
    if (result !== "ok") {
      await audit.record({
        type: "family.link_revoke",
        outcome: "failure",
        actorId: user.id,
        metadata: { reason: "not_allowed" },
      });
      return { status: "error", message: FAMILY_MESSAGES.linkMissing };
    }
    await audit.record({
      type: "family.link_revoke",
      outcome: "success",
      actorId: user.id,
    });
    return { status: "success", message: FAMILY_MESSAGES.revoked };
  } catch (error) {
    return providerFailure(error);
  }
}
