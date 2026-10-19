import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { addCalendarDays, istanbulToday } from "../../src/features/study/calendar.ts";
import { usernameToAuthEmail } from "../../src/features/auth/username.ts";
import {
  admin,
  createTestAccount,
  isAuthConfigured,
  localAdminEnv,
  signIn,
  useFreshClientIp,
  type TestAccount,
} from "./support/auth.ts";
import { seedCatalog, type SeededCatalog } from "./support/catalog.ts";

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

async function signInClient(account: TestAccount) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: usernameToAuthEmail(account.username),
    password: account.password,
  });
  expect(error).toBeNull();
  return client;
}

async function activateLink(studentId: string, parentId: string) {
  const codeHash = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const hash = codeHash.slice(0, 64);
  const { error: inviteError } = await admin().rpc("create_family_invite", {
    p_student_id: studentId,
    p_code_hash: hash,
    p_expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  expect(inviteError).toBeNull();
  const { error: redeemError } = await admin().rpc("redeem_family_invite", {
    p_parent_id: parentId,
    p_code_hash: hash,
  });
  expect(redeemError).toBeNull();
  const { data: link, error: linkError } = await admin()
    .from("family_links")
    .select("id")
    .eq("student_id", studentId)
    .eq("status", "pending")
    .single<{ id: string }>();
  expect(linkError).toBeNull();
  const { data: approved, error: approveError } = await admin().rpc(
    "respond_family_link",
    {
      p_actor_id: studentId,
      p_link_id: link?.id,
      p_decision: "approve",
    },
  );
  expect(approveError).toBeNull();
  expect(approved).toBe("ok");
  return link!.id;
}

function logRow(studentId: string, catalog: SeededCatalog, requestId: string) {
  return {
    student_id: studentId,
    studied_on: istanbulToday(),
    subject_id: catalog.subjectId,
    topic_id: catalog.topicId,
    learning_outcome_id: catalog.outcomeId,
    question_count: 4,
    correct_count: 2,
    wrong_count: 1,
    blank_count: 1,
    duration_minutes: 15,
    request_id: requestId,
  };
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("a student sets a goal, records work, edits it and cannot save an inconsistent total", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Çalışan Öğrenci" });
  const today = istanbulToday();

  await signIn(page, student.username, student.password);
  await expect(page).toHaveURL(/\/ogrenci$/);
  await page.goto("/ogrenci/hedefler");
  await page.getByRole("textbox", { name: "Hedef", exact: true }).fill("10");
  await page.getByRole("button", { name: "Hedefi kaydet" }).click();
  await expect(page.getByText("Hedefin kaydedildi.")).toBeVisible();
  await expect(page.getByText("0 / 10 soru")).toBeVisible();
  await page.getByRole("textbox", { name: "Hedef", exact: true }).fill("12");
  await page.getByRole("button", { name: "Hedefi kaydet" }).click();
  await expect(page.getByText("0 / 12 soru")).toBeVisible();
  await expect(page.getByText("0 / 10 soru")).toHaveCount(0);

  await page.goto("/ogrenci/calisma/yeni");
  await page.getByLabel("Tarih").fill(today);
  await page.getByLabel("Ders").selectOption({ label: catalog.subjectName });
  await page.getByRole("radio", { name: new RegExp(catalog.topicName) }).check();
  await page.getByLabel("Soru sayısı").fill("5");
  await page.getByLabel("Doğru").fill("4");
  await page.getByLabel("Yanlış").fill("1");
  await page.getByLabel("Boş").fill("0");
  await page.getByLabel("Süre").fill("25");
  await page.getByRole("button", { name: "Kaydı ekle" }).click();

  await expect(page).toHaveURL(/\/ogrenci\/calisma\?durum=kaydedildi/);
  await expect(page.getByText("Çalışma kaydın eklendi.")).toBeVisible();
  await expect(page.getByText("5 soru · 4 doğru, 1 yanlış, 0 boş")).toBeVisible();
  await expect(page.getByText(catalog.topicName)).toBeVisible();
  await expect(page.getByText("25 dakika", { exact: true })).toBeVisible();

  await page.goto("/ogrenci");
  await expect(page.getByText("5 / 12 soru")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/ogrenci/calisma");
  await page.getByRole("link", { name: "Düzenle" }).click();
  await page.getByLabel("Doğru").fill("3");
  await page.getByLabel("Yanlış").fill("1");
  await page.getByLabel("Boş").fill("1");
  await page.getByRole("button", { name: "Değişikliği kaydet" }).click();
  await expect(page.getByText("Çalışma kaydın güncellendi.")).toBeVisible();
  await expect(page.getByText("5 soru · 3 doğru, 1 yanlış, 1 boş")).toBeVisible();

  await page.getByRole("link", { name: "Düzenle" }).click();
  await page.getByRole("button", { name: "Kaydı sil" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Kaydı sil" }).click();
  await expect(page.getByText("Çalışma kaydı silindi.")).toBeVisible();
  await expect(page.getByText("Bu tarihlerde kayıt yok.")).toBeVisible();

  await page.goto("/ogrenci/calisma/yeni");
  await page.getByLabel("Ders").selectOption({ label: catalog.subjectName });
  await page.getByLabel("Soru sayısı").fill("5");
  await page.getByLabel("Doğru").fill("1");
  await page.getByLabel("Yanlış").fill("1");
  await page.getByLabel("Boş").fill("1");
  await page.getByLabel("Süre").fill("10");
  await page.getByRole("button", { name: "Kaydı ekle" }).click();
  await expect(
    page.getByText("Doğru, yanlış ve boş toplamı soru sayısına eşit olmalı."),
  ).toBeVisible();

  const { data: logs } = await admin()
    .from("study_logs")
    .select("id")
    .eq("student_id", student.id);
  expect(logs ?? []).toEqual([]);
  const { data: goals } = await admin()
    .from("study_goals")
    .select("target_questions")
    .eq("student_id", student.id);
  expect(goals).toEqual([{ target_questions: 12 }]);

  await page.goto("/ogrenci/hedefler");
  await expectNoHorizontalOverflow(page);
  await page.goto("/ogrenci/calisma");
  await expectNoHorizontalOverflow(page);
});

test("study rows stay with the owner, an active parent can read them, and a repeat does not duplicate", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Öğrenci A" });
  const other = await createTestAccount({ displayName: "Öğrenci B" });
  const parent = await createTestAccount({ roles: ["parent"], displayName: "Veli A" });
  const adminAccount = await createTestAccount({
    roles: ["parent", "admin"],
    displayName: "Yönetici Veli",
  });
  const today = istanbulToday();
  const requestId = randomUUID();

  const studentClient = await signInClient(student);
  const first = await studentClient
    .from("study_logs")
    .insert(logRow(student.id, catalog, requestId));
  expect(first.error).toBeNull();
  const second = await studentClient
    .from("study_logs")
    .insert(logRow(student.id, catalog, requestId));
  expect(second.error).not.toBeNull();
  const { data: once } = await admin()
    .from("study_logs")
    .select("id")
    .eq("student_id", student.id)
    .eq("request_id", requestId);
  expect(once).toHaveLength(1);

  const negative = await studentClient.from("study_logs").insert({
    ...logRow(student.id, catalog, randomUUID()),
    correct_count: -1,
  });
  expect(negative.error).not.toBeNull();
  const inconsistent = await studentClient.from("study_logs").insert({
    ...logRow(student.id, catalog, randomUUID()),
    question_count: 5,
    correct_count: 1,
    wrong_count: 1,
    blank_count: 1,
  });
  expect(inconsistent.error).not.toBeNull();
  const future = await studentClient.from("study_logs").insert({
    ...logRow(student.id, catalog, randomUUID()),
    studied_on: addCalendarDays(today, 1),
  });
  expect(future.error).not.toBeNull();
  const otherOwner = await studentClient
    .from("study_logs")
    .insert(logRow(other.id, catalog, randomUUID()));
  expect(otherOwner.error).not.toBeNull();

  const otherClient = await signInClient(other);
  const { data: stolen } = await otherClient
    .from("study_logs")
    .select("id")
    .eq("student_id", student.id);
  expect(stolen ?? []).toEqual([]);

  const parentClient = await signInClient(parent);
  const { data: before } = await parentClient.from("study_logs").select("id");
  expect(before ?? []).toEqual([]);
  const parentInsert = await parentClient
    .from("study_logs")
    .insert(logRow(student.id, catalog, randomUUID()));
  expect(parentInsert.error).not.toBeNull();

  const adminClient = await signInClient(adminAccount);
  const { data: asAdmin } = await adminClient
    .from("study_logs")
    .select("id")
    .eq("student_id", student.id);
  expect(asAdmin ?? []).toEqual([]);

  const linkId = await activateLink(student.id, parent.id);
  const { data: visible } = await parentClient
    .from("study_logs")
    .select("question_count")
    .eq("student_id", student.id);
  expect(visible).toEqual([{ question_count: 4 }]);
  await parentClient
    .from("study_logs")
    .update({ duration_minutes: 1 })
    .eq("student_id", student.id);
  const { data: unchanged } = await admin()
    .from("study_logs")
    .select("duration_minutes")
    .eq("student_id", student.id)
    .single();
  expect(unchanged?.duration_minutes).toBe(15);

  await signIn(page, parent.username, parent.password);
  await expect(page).toHaveURL(/\/veli$/);
  await page.goto(`/veli/ogrenci/${student.id}`);
  await expect(page).toHaveURL(new RegExp(`/veli/ogrenci/${student.id}$`));
  await expect(page.getByRole("heading", { name: "Öğrenci A" })).toBeVisible();
  await expect(page.getByText("4 soru · 2 doğru, 1 yanlış, 1 boş")).toBeVisible();
  await expect(page.getByRole("link", { name: "Düzenle" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  const { error: revokeError } = await admin().rpc("revoke_family_link", {
    p_actor_id: parent.id,
    p_link_id: linkId,
  });
  expect(revokeError).toBeNull();
  const { data: after } = await parentClient
    .from("study_logs")
    .select("id")
    .eq("student_id", student.id);
  expect(after ?? []).toEqual([]);
  await page.goto(`/veli/ogrenci/${student.id}`);
  await expect(page.getByText("Aradığın sayfa bulunamadı")).toBeVisible();

  await studentClient.auth.signOut();
  await otherClient.auth.signOut();
  await parentClient.auth.signOut();
  await adminClient.auth.signOut();
});
