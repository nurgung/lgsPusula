import { randomBytes } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAccount,
  createAdminClient,
  generateTemporaryPassword,
  readAdminEnv,
  type AccountRole,
  type AdminEnv,
} from "../../../scripts/lib/account-admin.ts";
import { E2E_ACCOUNT_PREFIX as E2E_USERNAME_PREFIX } from "./catalog-signature.ts";

export { E2E_USERNAME_PREFIX };

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.AUTH_SECRET,
  );
}

/** Test helpers create and delete accounts; they must never point at staging or production. */
export function localAdminEnv(): AdminEnv {
  const env = readAdminEnv();
  const host = new URL(env.url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`E2E account helpers only run against local Supabase, not ${host}.`);
  }
  return env;
}

let adminClient: SupabaseClient | undefined;
export function admin(): SupabaseClient {
  adminClient ??= createAdminClient(localAdminEnv());
  return adminClient;
}

export type TestAccount = { id: string; username: string; password: string };

/** Fictional account, unique per test so parallel tests never share state. */
export async function createTestAccount({
  roles = ["student"],
  mustChangePassword = false,
  displayName = "Deneme Kullanıcı",
}: {
  roles?: AccountRole[];
  mustChangePassword?: boolean;
  displayName?: string;
} = {}): Promise<TestAccount> {
  const username = `${E2E_USERNAME_PREFIX}${randomBytes(6).toString("hex")}`;
  const password = generateTemporaryPassword();
  const id = await createAccount(admin(), {
    username,
    displayName,
    roles,
    password,
  });
  if (!mustChangePassword) {
    const { error } = await admin()
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", id);
    if (error) throw new Error(`profile update failed (${error.code})`);
  }
  return { id, username, password };
}

/** Each test gets its own client IP so the shared per-IP login limit does not leak across tests. */
export async function useFreshClientIp(page: Page) {
  const ip = `198.18.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;
  await page.setExtraHTTPHeaders({ "x-real-ip": ip });
  return ip;
}

export async function signIn(page: Page, username: string, password: string) {
  await page.goto("/giris");
  await page.getByLabel("Kullanıcı adı").fill(username);
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

/** Next.js adds its own role="alert" route announcer, so alerts are matched by text. */
export async function expectAlert(page: Page, text: string) {
  await expect(page.getByRole("alert").filter({ hasText: text })).toBeVisible();
}

export async function expectSignedOut(page: Page) {
  await page.goto("/hesap");
  await expect(page).toHaveURL(/\/giris$/);
}
