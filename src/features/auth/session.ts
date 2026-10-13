import "server-only";
import { isAuthApiError, isAuthSessionMissingError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";
import { USER_ROLES, type UserRole } from "@/types/roles";
import { getSupabaseConfig } from "@/services/supabase/config";
import { createSessionClient } from "@/services/supabase/server-client";
import { AuthProviderError } from "@/services/supabase/auth-adapters";
import { ACCOUNT_PATH, CHANGE_PASSWORD_PATH, LOGIN_PATH, landingPathFor } from "./paths";

export type AssuranceLevel = "aal1" | "aal2";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  roles: UserRole[];
  mustChangePassword: boolean;
  /** aal2 means this session completed TOTP. Admin pages require it (decision 0.13). */
  assuranceLevel: AssuranceLevel;
};

const profileRowSchema = z.object({
  username: z.string(),
  display_name: z.string(),
  roles: z.array(z.enum(USER_ROLES)).min(1),
  must_change_password: z.boolean(),
});

/**
 * Data access layer entry point: the only way pages and actions learn who is signed in.
 * The user is verified with the auth server on every request (not just the cookie), so a
 * session ended elsewhere stops working on the next request. Deduplicated per request only;
 * never cached across requests or users.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Always request-time, even when auth is not configured at build time.
  await connection();
  if (!getSupabaseConfig()) return null;

  const supabase = await createSessionClient({ writable: false });
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isAuthSessionMissingError(error) || isAuthApiError(error)) return null;
    throw new AuthProviderError("get_user");
  }

  // Read under RLS as the user: the policy only returns their own row.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name, roles, must_change_password")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) throw new AuthProviderError("get_profile");
  // An account without a profile was not created by the setup script: treat as signed out.
  if (!profile) return null;

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // Unknown assurance is treated as aal1, so admin pages stay closed.
  if (assuranceError) console.error("get_aal failed", { code: assuranceError.code });

  const row = profileRowSchema.parse(profile);
  return {
    id: data.user.id,
    username: row.username,
    displayName: row.display_name,
    roles: row.roles,
    mustChangePassword: row.must_change_password,
    assuranceLevel: assurance?.currentLevel === "aal2" ? "aal2" : "aal1",
  };
});

export { ACCOUNT_PATH, CHANGE_PASSWORD_PATH, LOGIN_PATH, landingPathFor };

/**
 * Redirects to the login page when nobody is signed in, and to the password change page while
 * a temporary password is still in use.
 */
export async function requireUser({
  allowPendingPasswordChange = false,
}: { allowPendingPasswordChange?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);
  if (user.mustChangePassword && !allowPendingPasswordChange) {
    redirect(CHANGE_PASSWORD_PATH);
  }
  return user;
}
