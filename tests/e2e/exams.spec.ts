import { randomUUID } from "node:crypto";
import { type Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { createClient } from "@supabase/supabase-js";
import { istanbulToday } from "../../src/features/study/calendar.ts";
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
import { seedCatalog } from "./support/catalog.ts";

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

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("a student records a branch exam, edits nets and parents only read", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Deneme Öğrenci" });
  const other = await createTestAccount({ displayName: "Başka Öğrenci" });
  const parent = await createTestAccount({ roles: ["parent"], displayName: "Deneme Veli" });
  const today = istanbulToday();

  await signIn(page, student.username, student.password);
  await expect(page).toHaveURL(/\/ogrenci$/);
  await page.goto("/ogrenci/denemeler/yeni");
  await expect(page.getByRole("heading", { name: "Yeni deneme" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByLabel("Deneme adı").fill("Ekim branş");
  await page.getByLabel("Deneme türü").selectOption("branch");
  await page.locator('select[name="branch.subjectId"]').selectOption({
    label: catalog.subjectName,
  });
  await page.locator('input[name="branch.questionCount"]').fill("10");
  await page.locator('input[name="branch.correctCount"]').fill("0");
  await page.locator('input[name="branch.wrongCount"]').fill("6");
  await expect(page.locator('input[name="branch.blankCount"]')).toHaveValue("4");
  await page.getByRole("button", { name: "Denemeyi kaydet" }).click();
  await expect(page.getByText("Deneme kaydedildi.")).toBeVisible();
  const celebration = page.getByRole("dialog");
  await expect(celebration).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(celebration).toHaveCount(0);
  await expect(page.getByText("Toplam net 0,00")).toBeVisible();

  await page.getByRole("link", { name: "Detay / düzenle" }).click();
  await expect(page.getByRole("heading", { name: "Ekim branş" })).toBeVisible();
  await expect(page.getByText("-2,00").first()).toBeVisible();

  await page.locator('input[name="branch.correctCount"]').fill("6");
  await page.locator('input[name="branch.wrongCount"]').fill("3");
  await expect(page.locator('input[name="branch.blankCount"]')).toHaveValue("1");
  await page.getByRole("button", { name: "Değişikliği kaydet" }).click();
  await expect(page.getByText("Deneme güncellendi.")).toBeVisible();
  await expect(page.getByText("Toplam net 5,00")).toBeVisible();

  const studentClient = await signInClient(student);
  const { data: ownRows, error: ownError } = await studentClient
    .from("exams")
    .select("id, total_net")
    .eq("student_id", student.id);
  expect(ownError).toBeNull();
  expect(ownRows?.length).toBe(1);
  expect(Number(ownRows?.[0]?.total_net)).toBe(5);
  const examId = ownRows![0]!.id as string;

  const otherClient = await signInClient(other);
  const { data: stolen } = await otherClient.from("exams").select("id").eq("id", examId);
  expect(stolen ?? []).toEqual([]);
  const { error: writeAsOther } = await otherClient.from("exams").insert({
    student_id: student.id,
    title: "Çalıntı",
    taken_on: today,
    exam_type: "branch",
    rule_version: "lgs-v1",
    total_net: 1,
    request_id: randomUUID(),
  });
  expect(writeAsOther).not.toBeNull();

  await page.goto(`/ogrenci/denemeler/${examId}`);
  await expectNoHorizontalOverflow(page);

  const parentClient = await signInClient(parent);
  const { data: beforeLink } = await parentClient
    .from("exams")
    .select("id")
    .eq("id", examId);
  expect(beforeLink ?? []).toEqual([]);

  const linkId = await activateLink(student.id, parent.id);
  const { data: afterLink, error: parentReadError } = await parentClient
    .from("exams")
    .select("id, total_net")
    .eq("id", examId);
  expect(parentReadError).toBeNull();
  expect(afterLink?.length).toBe(1);

  await parentClient.from("exams").update({ title: "Veli değiştirdi" }).eq("id", examId);
  const { data: unchanged } = await admin()
    .from("exams")
    .select("title")
    .eq("id", examId)
    .single();
  expect(unchanged?.title).toBe("Ekim branş");

  await page.context().clearCookies();
  await signIn(page, parent.username, parent.password);
  await expect(page).toHaveURL(/\/veli$/);
  await page.goto(`/veli/ogrenci/${student.id}`);
  await expect(page.getByText("Ekim branş")).toBeVisible();
  await expect(page.getByText("Toplam net 5,00")).toBeVisible();
  await expect(page.getByRole("link", { name: "Detay / düzenle" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  const { error: revokeError } = await admin().rpc("revoke_family_link", {
    p_actor_id: parent.id,
    p_link_id: linkId,
  });
  expect(revokeError).toBeNull();
  const { data: afterRevoke } = await parentClient
    .from("exams")
    .select("id")
    .eq("id", examId);
  expect(afterRevoke ?? []).toEqual([]);

  await studentClient.auth.signOut();
  await otherClient.auth.signOut();
  await parentClient.auth.signOut();
});

test("database rejects an inconsistent subject total", async () => {
  const student = await createTestAccount({ displayName: "Kısıt Öğrenci" });
  const catalog = await seedCatalog();
  const { data: exam, error } = await admin()
    .from("exams")
    .insert({
      student_id: student.id,
      title: "Kısıt testi",
      taken_on: istanbulToday(),
      exam_type: "branch",
      rule_version: "lgs-v1",
      total_net: 0,
      request_id: randomUUID(),
    })
    .select("id")
    .single<{ id: string }>();
  expect(error).toBeNull();
  const { error: badSubject } = await admin().from("exam_subject_results").insert({
    exam_id: exam!.id,
    subject_id: catalog.subjectId,
    question_count: 10,
    correct_count: 5,
    wrong_count: 5,
    blank_count: 5,
    net: 0,
  });
  expect(badSubject).not.toBeNull();
});
