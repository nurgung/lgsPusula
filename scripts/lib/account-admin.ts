// Account administration shared by the setup script and the e2e test setup.
// Runs with the service_role key, so it must only ever run on a trusted machine, never in the app.
import { randomInt } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isValidUsername,
  usernameToAuthEmail,
} from "../../src/features/auth/username.ts";

export type AccountRole = "student" | "parent" | "admin";

export type AdminEnv = { url: string; anonKey: string; serviceRoleKey: string };

export function readAdminEnv(source: NodeJS.ProcessEnv = process.env): AdminEnv {
  const url = source.SUPABASE_URL?.trim();
  const anonKey = source.SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = source.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing = [
    ["SUPABASE_URL", url],
    ["SUPABASE_ANON_KEY", anonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
  return { url, anonKey, serviceRoleKey };
}

const noSession = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

export function createAdminClient(env: AdminEnv): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, { auth: noSession });
}

// No 0/O, 1/l/I: the password is read off a screen and typed by hand.
const PASSWORD_LETTERS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_DIGITS = "23456789";
const PASSWORD_ALPHABET = PASSWORD_LETTERS + PASSWORD_DIGITS;

/** 16 random characters (~91 bits) in groups of four, always with a letter and a digit. */
export function generateTemporaryPassword(): string {
  for (;;) {
    const chars = Array.from(
      { length: 16 },
      () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)],
    ).join("");
    if (/[A-Za-z]/.test(chars) && /\d/.test(chars)) {
      return [0, 4, 8, 12].map((start) => chars.slice(start, start + 4)).join("-");
    }
  }
}

export function validateRoles(roles: readonly AccountRole[]): void {
  if (roles.length === 0) throw new Error("At least one role is required.");
  if (roles.includes("student") && roles.length > 1) {
    throw new Error("A student account cannot have other roles.");
  }
  if (roles.includes("admin") && !roles.includes("parent")) {
    throw new Error("Admin is only granted together with parent.");
  }
}

export async function createAccount(
  admin: SupabaseClient,
  input: {
    username: string;
    displayName: string;
    roles: AccountRole[];
    password: string;
  },
): Promise<string> {
  if (!isValidUsername(input.username)) throw new Error("Invalid username.");
  validateRoles(input.roles);

  const { data, error } = await admin.auth.admin.createUser({
    email: usernameToAuthEmail(input.username),
    password: input.password,
    // No e-mail is ever sent (decision 0.8); the address is a placeholder on `.invalid`.
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Could not create auth user (${error?.code ?? "unknown"}).`);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    username: input.username,
    display_name: input.displayName,
    roles: input.roles,
    must_change_password: true,
  });
  if (profileError) {
    // Do not leave an auth user without a profile behind.
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(`Could not create profile (${profileError.code}).`);
  }

  await recordAdminEvent(admin, "admin.account_create", data.user.id);
  return data.user.id;
}

export async function findAccountId(admin: SupabaseClient, username: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle<{ id: string }>();
  if (error) throw new Error(`Could not read profile (${error.code}).`);
  return data?.id ?? null;
}

/**
 * Sets a new temporary password, forces a change on next login and ends every existing session
 * of the account (by signing in with the new password and signing out globally).
 */
export async function resetPassword(
  env: AdminEnv,
  admin: SupabaseClient,
  username: string,
  password: string,
): Promise<void> {
  const userId = await findAccountId(admin, username);
  if (!userId) throw new Error("No account with this username.");

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(`Could not update password (${error.code ?? "unknown"}).`);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (profileError) throw new Error(`Could not update profile (${profileError.code}).`);

  await signOutEverywhere(env, username, password);
  await recordAdminEvent(admin, "admin.password_reset", userId);
}

export async function signOutEverywhere(
  env: AdminEnv,
  username: string,
  password: string,
) {
  const client = createClient(env.url, env.anonKey, { auth: noSession });
  const { error } = await client.auth.signInWithPassword({
    email: usernameToAuthEmail(username),
    password,
  });
  if (error)
    throw new Error(`Could not open a session to revoke (${error.code ?? "unknown"}).`);
  const { error: signOutError } = await client.auth.signOut({ scope: "global" });
  if (signOutError) {
    throw new Error(`Could not end sessions (${signOutError.code ?? "unknown"}).`);
  }
}

async function recordAdminEvent(
  admin: SupabaseClient,
  type: "admin.account_create" | "admin.password_reset",
  subjectId: string,
) {
  // The script has no signed-in actor; the affected account is recorded as the actor.
  const { error } = await admin
    .from("audit_events")
    .insert({ event_type: type, outcome: "success", actor_id: subjectId, metadata: {} });
  if (error) console.error(`audit_events insert failed (${error.code})`);
}
