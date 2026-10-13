"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/services/supabase/config";
import {
  AuthProviderError,
  clearMustChangePassword,
  createAuditLog,
  createRateLimiter,
  findUserIdByUsername,
  signInWithUsername,
  updatePassword,
  verifyPassword,
} from "@/services/supabase/auth-adapters";
import {
  createServiceClient,
  createSessionClient,
} from "@/services/supabase/server-client";
import { attemptPasswordChange } from "./change-password";
import { getClientIp } from "./client-ip";
import { AUTH_MESSAGES, type AuthFormState } from "./form-state";
import { attemptLogin } from "./login";
import { retryAfterMinutes } from "./rate-limit";
import { changePasswordSchema, fieldErrorsFrom, loginSchema } from "./schemas";
import {
  ACCOUNT_PATH,
  LOGIN_PATH,
  getCurrentUser,
  landingPathFor,
  requireUser,
} from "./session";

// Every action re-reads the session on the server; nothing from the client (user id, role,
// redirect target) is trusted. Next.js checks the Origin header of Server Action requests.

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const config = getSupabaseConfig();
  if (!config) return { status: "error", message: AUTH_MESSAGES.notConfigured };

  const rawUsername = text(formData, "username");
  const parsed = loginSchema.safeParse({
    username: rawUsername,
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: AUTH_MESSAGES.formInvalid,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { username: rawUsername.slice(0, 64) },
    };
  }

  const values = { username: parsed.data.username };
  let destination: string;
  try {
    const session = await createSessionClient({ writable: true });
    const service = createServiceClient();
    const result = await attemptLogin(
      { ...parsed.data, clientIp: getClientIp(await headers()) },
      {
        rateLimiter: createRateLimiter(service),
        audit: createAuditLog(service),
        rateLimitSecret: config.authSecret,
        signIn: (username, password) => signInWithUsername(session, username, password),
        findUserIdByUsername: (username) => findUserIdByUsername(service, username),
      },
    );
    if (result.status === "rate_limited") {
      return {
        status: "error",
        message: AUTH_MESSAGES.rateLimited(retryAfterMinutes(result.retryAfterSeconds)),
        values,
      };
    }
    if (result.status === "invalid_credentials") {
      return { status: "error", message: AUTH_MESSAGES.invalidCredentials, values };
    }
    const { data: profile, error } = await service
      .from("profiles")
      .select("must_change_password")
      .eq("id", result.userId)
      .maybeSingle<{ must_change_password: boolean }>();
    if (error) throw new AuthProviderError("get_profile");
    destination = landingPathFor({
      mustChangePassword: profile?.must_change_password ?? true,
    });
  } catch (error) {
    if (!(error instanceof AuthProviderError)) throw error;
    console.error(error.message);
    return { status: "error", message: AUTH_MESSAGES.providerError, values };
  }
  redirect(destination);
}

async function signOut(scope: "local" | "global"): Promise<AuthFormState> {
  if (!getSupabaseConfig()) redirect(LOGIN_PATH);
  const user = await getCurrentUser();
  const session = await createSessionClient({ writable: true });
  const { error } = await session.auth.signOut({ scope });
  if (error) {
    console.error("sign_out failed", { scope, code: error.code });
    return { status: "error", message: AUTH_MESSAGES.signOutFailed };
  }
  if (user) {
    await createAuditLog(createServiceClient()).record({
      type: scope === "global" ? "auth.logout_all" : "auth.logout",
      outcome: "success",
      actorId: user.id,
    });
  }
  redirect(`${LOGIN_PATH}?cikis=${scope === "global" ? "tum" : "tamam"}`);
}

export async function signOutAction(): Promise<AuthFormState> {
  return signOut("local");
}

export async function signOutEverywhereAction(): Promise<AuthFormState> {
  return signOut("global");
}

export async function changePasswordAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await requireUser({ allowPendingPasswordChange: true });
  const config = getSupabaseConfig();
  if (!config) return { status: "error", message: AUTH_MESSAGES.notConfigured };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: text(formData, "currentPassword"),
    newPassword: text(formData, "newPassword"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: AUTH_MESSAGES.formInvalid,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  try {
    const session = await createSessionClient({ writable: true });
    const service = createServiceClient();
    const result = await attemptPasswordChange(
      {
        userId: user.id,
        username: user.username,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
      {
        rateLimiter: createRateLimiter(service),
        audit: createAuditLog(service),
        rateLimitSecret: config.authSecret,
        verifyPassword,
        updatePassword: (newPassword) => updatePassword(session, newPassword),
        signOutOtherSessions: async () => {
          const { error } = await session.auth.signOut({ scope: "others" });
          if (error) throw new AuthProviderError("sign_out_others");
        },
        clearMustChangePassword: (userId) => clearMustChangePassword(service, userId),
      },
    );
    switch (result.status) {
      case "success":
        break;
      case "rate_limited":
        return {
          status: "error",
          message: AUTH_MESSAGES.rateLimited(retryAfterMinutes(result.retryAfterSeconds)),
        };
      case "invalid_current_password":
        return {
          status: "error",
          message: AUTH_MESSAGES.formInvalid,
          fieldErrors: { currentPassword: AUTH_MESSAGES.invalidCurrentPassword },
        };
      case "weak_password":
        return {
          status: "error",
          message: AUTH_MESSAGES.formInvalid,
          fieldErrors: { newPassword: AUTH_MESSAGES.weakPassword },
        };
      case "same_password":
        return {
          status: "error",
          message: AUTH_MESSAGES.formInvalid,
          fieldErrors: { newPassword: AUTH_MESSAGES.samePassword },
        };
      case "error":
        return { status: "error", message: AUTH_MESSAGES.providerError };
    }
  } catch (error) {
    if (!(error instanceof AuthProviderError)) throw error;
    console.error(error.message);
    return { status: "error", message: AUTH_MESSAGES.providerError };
  }
  redirect(`${ACCOUNT_PATH}?durum=parola-degisti`);
}
