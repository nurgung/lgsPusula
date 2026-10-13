import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { usernameToAuthEmail } from "../../src/features/auth/username.ts";
import {
  admin,
  createTestAccount,
  expectAlert,
  isAuthConfigured,
  localAdminEnv,
  signIn,
  useFreshClientIp,
} from "./support/auth.ts";
import { totpCode } from "./support/totp.ts";

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

test("a student cannot read another student by changing the id in the URL", async ({
  page,
}) => {
  const studentA = await createTestAccount({ displayName: "Öğrenci A" });
  const studentB = await createTestAccount({ displayName: "Öğrenci B" });
  await signIn(page, studentA.username, studentA.password);
  await expect(page).toHaveURL(/\/ogrenci$/);

  await page.goto(`/veli/ogrenci/${studentB.id}`);
  await expect(page.getByText("Aradığın sayfa bulunamadı")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Öğrenci B" })).toHaveCount(0);
});

test("a parent sees only the student with an active link, and revoke removes access", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const student = await createTestAccount({ displayName: "Öğrenci A" });
  const otherStudent = await createTestAccount({ displayName: "Öğrenci B" });
  const parent = await createTestAccount({
    roles: ["parent"],
    displayName: "Veli A",
  });
  const otherParent = await createTestAccount({
    roles: ["parent"],
    displayName: "Veli B",
  });

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await useFreshClientIp(studentPage);
  await signIn(studentPage, student.username, student.password);
  await studentPage.getByRole("button", { name: "Veli bağla" }).click();
  const code = (await studentPage.getByTestId("invite-code").innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  const parentContext = await browser.newContext();
  const parentPage = await parentContext.newPage();
  await useFreshClientIp(parentPage);
  await signIn(parentPage, parent.username, parent.password);
  await expect(parentPage).toHaveURL(/\/veli$/);
  await parentPage.getByLabel("Davet kodu").fill(code);
  await parentPage.getByRole("button", { name: "Kodu gönder" }).click();
  await expect(parentPage.getByText("Onayını bekliyorsun.")).toBeVisible();

  await studentPage.reload();
  await expect(
    studentPage.getByText("Veli A velin olarak bağlanmak istiyor."),
  ).toBeVisible();
  await studentPage.getByRole("button", { name: "Onayla" }).click();
  await expect(studentPage.getByText("Bağlantı kuruldu.")).toBeVisible();

  await parentPage.reload();
  await parentPage.getByRole("link", { name: "Öğrenciyi gör" }).click();
  await expect(parentPage).toHaveURL(new RegExp(`/veli/ogrenci/${student.id}$`));
  await expect(parentPage.getByRole("heading", { name: "Öğrenci A" })).toBeVisible();

  await parentPage.goto(`/veli/ogrenci/${otherStudent.id}`);
  await expect(parentPage.getByText("Aradığın sayfa bulunamadı")).toBeVisible();
  await expect(parentPage.getByRole("heading", { name: "Öğrenci B" })).toHaveCount(0);

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await useFreshClientIp(otherPage);
  await signIn(otherPage, otherParent.username, otherParent.password);
  await expect(otherPage).toHaveURL(/\/veli$/);
  await otherPage.goto(`/veli/ogrenci/${student.id}`);
  await expect(otherPage.getByText("Aradığın sayfa bulunamadı")).toBeVisible();

  await parentPage.goto(`/veli/ogrenci/${student.id}`);
  await parentPage.getByRole("button", { name: "Bağlantıyı kaldır" }).click();
  await parentPage
    .getByRole("alertdialog")
    .getByRole("button", { name: "Bağlantıyı kaldır" })
    .click();
  await expect(parentPage.getByText("Bağlantı kaldırıldı.")).toBeVisible();
  await parentPage.goto(`/veli/ogrenci/${student.id}`);
  await expect(parentPage.getByText("Aradığın sayfa bulunamadı")).toBeVisible();
  await expect(parentPage.getByRole("heading", { name: "Öğrenci A" })).toHaveCount(0);

  await studentContext.close();
  await parentContext.close();
  await otherContext.close();
});

test("a normal user cannot make themselves an admin", async () => {
  const student = await createTestAccount();
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
  const { data: own } = await admin()
    .from("profiles")
    .select("roles")
    .eq("id", student.id)
    .single();
  expect(own?.roles).toEqual(["student"]);
  await client.auth.signOut();
});

test("family links are readable only by the two people in the link, and not writable", async () => {
  const student = await createTestAccount({ displayName: "Öğrenci A" });
  const other = await createTestAccount({ displayName: "Öğrenci B" });
  const parent = await createTestAccount({ roles: ["parent"], displayName: "Veli A" });

  const codeHash = randomBytes(32).toString("hex");
  const { data: inviteId, error: inviteError } = await admin().rpc(
    "create_family_invite",
    {
      p_student_id: student.id,
      p_code_hash: codeHash,
      p_expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
  );
  expect(inviteError).toBeNull();
  expect(inviteId).toBeTruthy();

  const { error: redeemError } = await admin().rpc("redeem_family_invite", {
    p_parent_id: parent.id,
    p_code_hash: codeHash,
  });
  expect(redeemError).toBeNull();

  const { data: approved, error: approveError } = await admin().rpc(
    "respond_family_link",
    {
      p_actor_id: student.id,
      p_link_id: (
        await admin()
          .from("family_links")
          .select("id")
          .eq("student_id", student.id)
          .single()
      ).data?.id,
      p_decision: "approve",
    },
  );
  expect(approveError).toBeNull();
  expect(approved).toBe("ok");

  const studentClient = anonClient();
  await studentClient.auth.signInWithPassword({
    email: usernameToAuthEmail(student.username),
    password: student.password,
  });
  const { data: studentLinks } = await studentClient
    .from("family_links")
    .select("student_id");
  expect(studentLinks?.map((row) => row.student_id)).toEqual([student.id]);

  const { data: names } = await studentClient.rpc("visible_family_links");
  expect(names).toHaveLength(1);
  expect(names?.[0]?.parent_display_name).toBe("Veli A");

  const { error: updateError } = await studentClient
    .from("family_links")
    .update({ status: "revoked" })
    .eq("student_id", student.id);
  const { data: stillActive } = await admin()
    .from("family_links")
    .select("status")
    .eq("student_id", student.id)
    .single();
  expect(stillActive?.status).toBe("active");
  expect(updateError === null || stillActive?.status === "active").toBe(true);

  const { error: insertError } = await studentClient.from("family_links").insert({
    student_id: other.id,
    parent_id: parent.id,
    status: "active",
  });
  expect(insertError).not.toBeNull();

  const { data: invites } = await studentClient.from("family_invites").select("id");
  expect(invites ?? []).toEqual([]);

  const { error: createError } = await studentClient.rpc("create_family_invite", {
    p_student_id: student.id,
    p_code_hash: "cd".repeat(32),
    p_expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  expect(createError).not.toBeNull();

  const otherClient = anonClient();
  await otherClient.auth.signInWithPassword({
    email: usernameToAuthEmail(other.username),
    password: other.password,
  });
  const { data: otherLinks } = await otherClient.from("family_links").select("id");
  expect(otherLinks ?? []).toEqual([]);
  const { data: otherNames } = await otherClient.rpc("visible_family_links");
  expect(otherNames ?? []).toEqual([]);

  await studentClient.auth.signOut();
  await otherClient.auth.signOut();
});

test("admin pages reject a normal session and open after TOTP", async ({ page }) => {
  test.setTimeout(60_000);
  const parent = await createTestAccount({
    roles: ["parent"],
    displayName: "Sadece Veli",
  });
  await signIn(page, parent.username, parent.password);
  await expect(page).toHaveURL(/\/veli$/);
  await page.goto("/yonetici");
  await expect(page.getByText("Aradığın sayfa bulunamadı")).toBeVisible();
  await expect(page.getByText("Bu oturumda doğrulama tamam.")).toHaveCount(0);

  const adminAccount = await createTestAccount({
    roles: ["parent", "admin"],
    displayName: "Yönetici Veli",
  });
  await page.context().clearCookies();
  await signIn(page, adminAccount.username, adminAccount.password);
  await expect(page).toHaveURL(/\/veli$/);
  await page.goto("/yonetici");
  await expect(page).toHaveURL(/\/mfa$/);
  await expect(page.getByRole("heading", { name: "Yönetim" })).toHaveCount(0);

  await page.getByRole("button", { name: "Kuruluma başla" }).click();
  const secret = (await page.getByTestId("mfa-secret").innerText()).replace(/\s/g, "");
  expect(secret).toMatch(/^[A-Z2-7]+$/);
  await page.getByLabel("Doğrulama kodu").fill(totpCode(secret));
  await page.getByRole("button", { name: "Doğrula" }).click();
  await expect(page).toHaveURL(/\/yonetici$/);
  await expect(page.getByRole("heading", { name: "Yönetim" })).toBeVisible();
  await expect(page.getByText("Bu oturumda doğrulama tamam.")).toBeVisible();
});

test("an invite code is not stored or written to the audit log", async ({ page }) => {
  const student = await createTestAccount();
  await signIn(page, student.username, student.password);
  await page.getByRole("button", { name: "Veli bağla" }).click();
  const code = (await page.getByTestId("invite-code").innerText()).replace(
    /[^A-Z2-9]/g,
    "",
  );

  const { data: invites } = await admin().from("family_invites").select("code_hash");
  expect(invites?.some((row) => String(row.code_hash).includes(code))).toBe(false);

  const { data: events } = await admin()
    .from("audit_events")
    .select("event_type, metadata")
    .eq("actor_id", student.id);
  expect(JSON.stringify(events)).not.toContain(code);
});

test("too many wrong codes are rate limited", async ({ page }) => {
  const parent = await createTestAccount({ roles: ["parent"] });
  await signIn(page, parent.username, parent.password);
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Davet kodu").fill("ABCDE-FGHJK");
    await page.getByRole("button", { name: "Kodu gönder" }).click();
    await expectAlert(page, "Bu kod geçersiz");
  }
  await page.getByLabel("Davet kodu").fill("ABCDE-FGHJK");
  await page.getByRole("button", { name: "Kodu gönder" }).click();
  await expectAlert(page, "Çok fazla deneme yapıldı");
});
