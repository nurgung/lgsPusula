import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { resetPassword } from "../../scripts/lib/account-admin.ts";
import { usernameToAuthEmail } from "../../src/features/auth/username.ts";
import { RATE_LIMITS } from "../../src/features/auth/rate-limit.ts";
import {
  admin,
  createTestAccount,
  expectAlert,
  expectSignedOut,
  isAuthConfigured,
  localAdminEnv,
  signIn,
  useFreshClientIp,
} from "./support/auth.ts";

test.skip(
  !isAuthConfigured(),
  "Supabase is not configured (see README: yerel Supabase).",
);

test.beforeEach(async ({ page }) => {
  await useFreshClientIp(page);
});

const anonClient = () => {
  const env = localAdminEnv();
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

test("pages that need a session send signed-out visitors to /giris", async ({ page }) => {
  await expectSignedOut(page);
  await page.goto("/parola-degistir");
  await expect(page).toHaveURL(/\/giris$/);
});

test("first login with a temporary password forces a password change", async ({
  page,
}) => {
  const account = await createTestAccount({ mustChangePassword: true });
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/parola-degistir$/);
  await expect(page.getByText("Önce kendi parolanı belirle")).toBeVisible();

  // The account page stays closed until the password is changed.
  await page.goto("/hesap");
  await expect(page).toHaveURL(/\/parola-degistir$/);

  await page.getByLabel("Şu anki parola").fill(account.password);
  await page.getByLabel("Yeni parola", { exact: true }).fill("yeni-parola-2026");
  await page.getByLabel("Yeni parola (tekrar)").fill("yeni-parola-2026");
  await page.getByRole("button", { name: "Parolayı değiştir" }).click();

  await expect(page).toHaveURL(/\/hesap\?durum=parola-degisti$/);
  await expect(page.getByText("Parolan değişti.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Merhaba, Deneme Kullanıcı" }),
  ).toBeVisible();

  const { data } = await admin()
    .from("profiles")
    .select("must_change_password")
    .eq("id", account.id)
    .single();
  expect(data?.must_change_password).toBe(false);
});

test("password change validates input and the current password", async ({ page }) => {
  const account = await createTestAccount();
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/ogrenci$/);
  await page.goto("/parola-degistir");

  await page.getByLabel("Şu anki parola").fill("yanlis-parola-1");
  await page.getByLabel("Yeni parola", { exact: true }).fill("kisa");
  await page.getByLabel("Yeni parola (tekrar)").fill("kisa");
  await page.getByRole("button", { name: "Parolayı değiştir" }).click();
  await expectAlert(page, "en az 10 karakter");

  await page.getByLabel("Şu anki parola").fill("yanlis-parola-1");
  await page.getByLabel("Yeni parola", { exact: true }).fill("yeni-parola-2026");
  await page.getByLabel("Yeni parola (tekrar)").fill("yeni-parola-2026");
  await page.getByRole("button", { name: "Parolayı değiştir" }).click();
  await expectAlert(page, "Şu anki parolan hatalı.");
  await expect(page).toHaveURL(/\/parola-degistir$/);
});

test("wrong password and unknown user get the same message", async ({ page }) => {
  const account = await createTestAccount();
  await signIn(page, account.username, "yanlis-parola-1");
  await expectAlert(page, "Kullanıcı adı veya parola hatalı.");
  await expect(page.getByLabel("Kullanıcı adı")).toHaveValue(account.username);

  await signIn(page, "e2e_boyle_biri_yok", "yanlis-parola-1");
  await expectAlert(page, "Kullanıcı adı veya parola hatalı.");
});

test("session cookies are Secure, HttpOnly and SameSite=Lax", async ({
  page,
  context,
}) => {
  const account = await createTestAccount();
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/ogrenci$/);

  const authCookies = (await context.cookies()).filter((cookie) =>
    cookie.name.startsWith("sb-"),
  );
  expect(authCookies.length).toBeGreaterThan(0);
  for (const cookie of authCookies) {
    expect(cookie, cookie.name).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    });
  }
  expect(await page.evaluate(() => document.cookie)).not.toContain("sb-");
});

test("sign out ends the session", async ({ page }) => {
  const account = await createTestAccount();
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/ogrenci$/);
  await page.getByRole("link", { name: "Hesap" }).click();

  await page.getByRole("button", { name: "Çıkış yap", exact: true }).click();
  await expect(page).toHaveURL(/\/giris\?cikis=tamam$/);
  await expect(page.getByText("Çıkış yaptın.")).toBeVisible();
  await expectSignedOut(page);
});

test("signing out everywhere ends sessions on other devices", async ({
  page,
  browser,
}) => {
  const account = await createTestAccount();
  const otherDevice = await browser.newContext();
  const otherPage = await otherDevice.newPage();
  await useFreshClientIp(otherPage);
  await signIn(otherPage, account.username, account.password);
  await expect(otherPage).toHaveURL(/\/ogrenci$/);

  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/ogrenci$/);
  await page.getByRole("link", { name: "Hesap" }).click();
  await page.getByRole("button", { name: "Tüm cihazlarda çıkış yap" }).click();
  await page.getByRole("button", { name: "Hepsinden çıkış yap" }).click();
  await expect(page).toHaveURL(/\/giris\?cikis=tum$/);

  await expectSignedOut(otherPage);
  await otherDevice.close();
});

test("a reset by the setup script ends sessions and forces a new password", async ({
  page,
}) => {
  const account = await createTestAccount();
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/ogrenci$/);

  const temporary = "gecici-parola-77";
  await resetPassword(localAdminEnv(), admin(), account.username, temporary);

  await expectSignedOut(page);
  await signIn(page, account.username, account.password);
  await expectAlert(page, "Kullanıcı adı veya parola hatalı.");
  await signIn(page, account.username, temporary);
  await expect(page).toHaveURL(/\/parola-degistir$/);
});

test("too many attempts lock the username for a while, even with the right password", async ({
  page,
}) => {
  const account = await createTestAccount();
  for (let i = 0; i < RATE_LIMITS.loginByUsername.maxAttempts; i++) {
    await signIn(page, account.username, `yanlis-parola-${i}`);
    await expectAlert(page, "Kullanıcı adı veya parola hatalı.");
  }
  await signIn(page, account.username, account.password);
  await expectAlert(page, "Çok fazla deneme yapıldı");
  await expect(page).toHaveURL(/\/giris$/);

  const { data } = await admin()
    .from("audit_events")
    .select("outcome, metadata")
    .eq("actor_id", account.id)
    .eq("event_type", "auth.login")
    .eq("outcome", "blocked");
  expect(data).toHaveLength(1);
});

test("public sign-up is disabled", async () => {
  const { data, error } = await anonClient().auth.signUp({
    email: usernameToAuthEmail("e2e_disaridan"),
    password: "disaridan-kayit-1",
  });
  expect(error).not.toBeNull();
  expect(data.user).toBeNull();
});

test("users cannot change their roles or read other profiles and the audit log", async () => {
  const student = await createTestAccount();
  const other = await createTestAccount({ roles: ["parent", "admin"] });
  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email: usernameToAuthEmail(student.username),
    password: student.password,
  });
  expect(signInError).toBeNull();

  await client
    .from("profiles")
    .update({ roles: ["parent", "admin"] })
    .eq("id", student.id);
  await client
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", student.id);
  const { error: insertError } = await client.from("profiles").insert({
    id: other.id,
    username: "e2e_sahte",
    display_name: "Sahte",
    roles: ["admin"],
  });
  expect(insertError).not.toBeNull();

  const { data: own } = await admin()
    .from("profiles")
    .select("roles")
    .eq("id", student.id)
    .single();
  expect(own?.roles).toEqual(["student"]);

  const { data: visible } = await client.from("profiles").select("id");
  expect(visible?.map((row) => row.id)).toEqual([student.id]);

  const { data: audit } = await client.from("audit_events").select("id");
  expect(audit ?? []).toEqual([]);
  const { error: auditInsertError } = await client
    .from("audit_events")
    .insert({ event_type: "auth.login", outcome: "success", actor_id: student.id });
  expect(auditInsertError).not.toBeNull();

  const { error: rpcError } = await client.rpc("reset_rate_limit", {
    p_bucket_key: "login:x",
  });
  expect(rpcError).not.toBeNull();
  await client.auth.signOut();
});

test("audit events never contain passwords, usernames or tokens", async ({ page }) => {
  const account = await createTestAccount();
  await signIn(page, account.username, "yanlis-parola-1");
  await expectAlert(page, "Kullanıcı adı veya parola hatalı.");
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL(/\/ogrenci$/);

  const { data } = await admin()
    .from("audit_events")
    .select("event_type, outcome, metadata")
    .eq("actor_id", account.id);
  const stored = JSON.stringify(data);
  expect(data?.length).toBeGreaterThanOrEqual(2);
  for (const secret of [account.password, "yanlis-parola-1", account.username, "eyJ"]) {
    expect(stored).not.toContain(secret);
  }
});
