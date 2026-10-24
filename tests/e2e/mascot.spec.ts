import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
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
  const hash = (
    randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "")
  ).slice(0, 64);
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
  const { error: approveError } = await admin().rpc("respond_family_link", {
    p_actor_id: studentId,
    p_link_id: link?.id,
    p_decision: "approve",
  });
  expect(approveError).toBeNull();
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

test("a student chooses a character and can turn reminders off", async ({ page }) => {
  test.setTimeout(90_000);
  const student = await createTestAccount({ displayName: "Karakter Öğrencisi" });
  await signIn(page, student.username, student.password);
  await expect(page).toHaveURL(/\/ogrenci$/);

  await page.goto("/ogrenci/karakter");
  await page.getByRole("radio", { name: /Papatya/ }).check();
  await page.getByRole("button", { name: "Karakteri kaydet" }).click();
  await expect(page.getByText("Karakterin kaydedildi.")).toBeVisible();
  await expect(page.getByText("Bitki: Papatya")).toBeVisible();
  await expect(page.getByText("Aşama: Yeni arkadaş").first()).toBeVisible();
  await expect(page.getByText("Toplam 0 karakter puanı.")).toBeVisible();
  await expect(
    page.getByText("Bir gün ara vermek puanı düşürmez ve karakteri geri götürmez."),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/ogrenci/bildirimler");
  await page.getByLabel("Hatırlatmalar").selectOption({ label: "Açık" });
  await page.getByLabel("Sessiz saat başlangıcı").fill("12:00");
  await page.getByLabel("Sessiz saat bitişi").fill("12:00");
  await page.getByLabel("Günde en fazla").selectOption({ label: "1 hatırlatma" });
  await page.getByRole("button", { name: "Ayarları kaydet" }).click();
  await expect(page.getByText("Hatırlatma ayarların kaydedildi.")).toBeVisible();

  await page.goto("/ogrenci");
  const reminder = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Hatırlatma", level: 2 }),
  });
  await expect(reminder).toBeVisible();
  await expect(reminder).toContainText("Bugün henüz bir çalışma kaydı yok.");
  for (const word of ["net", "puan", "yanlış", "doğru", "sınav", "deneme"]) {
    await expect(reminder).not.toContainText(word);
  }
  await expectNoHorizontalOverflow(page);

  await page.goto("/ogrenci/bildirimler");
  await page.getByLabel("Hatırlatmalar").selectOption({ label: "Kapalı" });
  await page.getByRole("button", { name: "Ayarları kaydet" }).click();
  await expect(page.getByText("Hatırlatma ayarların kaydedildi.")).toBeVisible();
  await page.goto("/ogrenci");
  await expect(page.getByRole("heading", { name: "Hatırlatma", level: 2 })).toHaveCount(
    0,
  );
});

test("the same study log awards points once and a deleted log does not take them back", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Puan Öğrencisi" });
  const other = await createTestAccount({ displayName: "Başka Öğrenci" });
  const parent = await createTestAccount({
    roles: ["parent", "admin"],
    displayName: "Puan Velisi",
  });
  const studentClient = await signInClient(student);

  const { data: created, error: insertError } = await studentClient
    .from("study_logs")
    .insert(logRow(student.id, catalog, randomUUID()))
    .select("id")
    .single<{ id: string }>();
  expect(insertError).toBeNull();

  const rewards = () =>
    studentClient
      .from("reward_events")
      .select("points, idempotency_key, event_type")
      .eq("student_id", student.id);

  const first = await rewards();
  expect(first.error).toBeNull();
  expect(first.data).toEqual([
    {
      points: 5,
      idempotency_key: `study_log:${created?.id}`,
      event_type: "study_log",
    },
  ]);

  const again = await studentClient.rpc("sync_mascot_rewards");
  expect(again.error).toBeNull();
  expect(again.data).toBe(0);
  const afterSync = await rewards();
  expect(afterSync.data).toHaveLength(1);

  const { error: forged } = await studentClient.from("reward_events").insert({
    student_id: student.id,
    event_type: "study_log",
    points: 20,
    idempotency_key: "study_log:forged-key",
    rule_version: "mascot-v1",
  });
  expect(forged).not.toBeNull();

  const { error: edited } = await studentClient
    .from("study_logs")
    .update({ duration_minutes: 20 })
    .eq("id", created?.id);
  expect(edited).toBeNull();
  expect((await rewards()).data).toHaveLength(1);

  const { error: removed } = await studentClient
    .from("study_logs")
    .delete()
    .eq("id", created?.id);
  expect(removed).toBeNull();
  const afterDelete = await studentClient.rpc("sync_mascot_rewards");
  expect(afterDelete.data).toBe(0);
  expect((await rewards()).data).toHaveLength(1);

  const otherClient = await signInClient(other);
  const hidden = await otherClient
    .from("reward_events")
    .select("id")
    .eq("student_id", student.id);
  expect(hidden.data ?? []).toEqual([]);

  const parentBefore = await signInClient(parent);
  expect(
    (await parentBefore.from("reward_events").select("id").eq("student_id", student.id))
      .data ?? [],
  ).toEqual([]);
  await activateLink(student.id, parent.id);
  const parentRead = await parentBefore
    .from("reward_events")
    .select("points")
    .eq("student_id", student.id);
  expect(parentRead.data).toEqual([{ points: 5 }]);
  const parentWrite = await parentBefore
    .from("mascot_profiles")
    .insert({ student_id: student.id, species: "cat" });
  expect(parentWrite.error).not.toBeNull();
  const parentSync = await parentBefore.rpc("sync_mascot_rewards");
  expect(parentSync.error).not.toBeNull();

  await signIn(page, student.username, student.password);
  await expect(page).toHaveURL(/\/ogrenci$/);
  await page.goto("/ogrenci/karakter");
  await expect(page.getByText("Toplam 5 karakter puanı.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Toplam 5 karakter puanı.")).toBeVisible();
  await expect(page.getByText("Aşama: Yeni arkadaş").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("quiet hours and the daily cap block extra reminders", async () => {
  const student = await createTestAccount({ displayName: "Sessiz Öğrenci" });
  const client = await signInClient(student);

  const quiet = await client.from("notification_preferences").insert({
    student_id: student.id,
    enabled: true,
    quiet_start: "00:00:00",
    quiet_end: "24:00:00",
    max_per_day: 1,
  });
  expect(quiet.error).toBeNull();
  const duringQuiet = await client.rpc("open_study_reminder");
  expect(duringQuiet.error).toBeNull();
  expect(duringQuiet.data).toBeNull();
  const quietRows = await client
    .from("in_app_notices")
    .select("id")
    .eq("student_id", student.id);
  expect(quietRows.data ?? []).toEqual([]);

  const opened = await client
    .from("notification_preferences")
    .update({ quiet_start: "12:00:00", quiet_end: "12:00:00" })
    .eq("student_id", student.id);
  expect(opened.error).toBeNull();

  const first = await client.rpc("open_study_reminder");
  const second = await client.rpc("open_study_reminder");
  expect(first.error).toBeNull();
  expect(second.data).toBe(first.data);
  expect(first.data).toBeTruthy();
  const rows = await client
    .from("in_app_notices")
    .select("id")
    .eq("student_id", student.id);
  expect(rows.data).toHaveLength(1);

  const { error: customNotice } = await client.from("in_app_notices").insert({
    student_id: student.id,
    kind: "study_reminder",
    notice_date: istanbulToday(),
    sequence: 2,
  });
  expect(customNotice).not.toBeNull();

  const { error: dismissed } = await client
    .from("in_app_notices")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", first.data as string);
  expect(dismissed).toBeNull();
  const third = await client.rpc("open_study_reminder");
  expect(third.data).toBeNull();
  expect(
    (await client.from("in_app_notices").select("id").eq("student_id", student.id)).data,
  ).toHaveLength(1);

  const disabled = await client
    .from("notification_preferences")
    .update({ enabled: false })
    .eq("student_id", student.id);
  expect(disabled.error).toBeNull();
  const { error: cleared } = await client
    .from("in_app_notices")
    .update({ dismissed_at: null })
    .eq("id", first.data as string);
  expect(cleared).toBeNull();
  const whileOff = await client.rpc("open_study_reminder");
  expect(whileOff.data).toBeNull();
});

test("growth notices stay on the student who earned them and do not duplicate", async () => {
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Seri Öğrencisi" });
  const other = await createTestAccount({ displayName: "Başka Seri" });
  const parent = await createTestAccount({
    roles: ["parent"],
    displayName: "Seri Velisi",
  });
  const client = await signInClient(student);
  const today = istanbulToday();

  const first = await client.rpc("open_growth_notice", {
    p_kind: "streak_broken",
    p_notice_date: today,
  });
  const second = await client.rpc("open_growth_notice", {
    p_kind: "streak_broken",
    p_notice_date: today,
  });
  expect(first.error).toBeNull();
  expect(second.data).toBe(first.data);
  const rows = await client
    .from("in_app_notices")
    .select("id, kind")
    .eq("student_id", student.id);
  expect(rows.data).toEqual([{ id: first.data, kind: "streak_broken" }]);

  const { error: forged } = await client.from("in_app_notices").insert({
    student_id: student.id,
    kind: "mascot_sick",
    notice_date: today,
    sequence: 1,
  });
  expect(forged).not.toBeNull();

  const { error: dismissed } = await client
    .from("in_app_notices")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", first.data as string);
  expect(dismissed).toBeNull();
  const again = await client.rpc("open_growth_notice", {
    p_kind: "streak_broken",
    p_notice_date: today,
  });
  expect(again.data).toBeNull();
  expect(
    (await client.from("in_app_notices").select("id").eq("student_id", student.id)).data,
  ).toHaveLength(1);

  const otherClient = await signInClient(other);
  const hidden = await otherClient
    .from("in_app_notices")
    .select("id")
    .eq("student_id", student.id);
  expect(hidden.data ?? []).toEqual([]);
  const { error: otherLog } = await otherClient
    .from("study_logs")
    .insert(logRow(student.id, catalog, randomUUID()));
  expect(otherLog).not.toBeNull();

  const parentClient = await signInClient(parent);
  const parentCall = await parentClient.rpc("open_growth_notice", {
    p_kind: "stage_earned",
    p_notice_date: today,
  });
  expect(parentCall.error).not.toBeNull();
  const parentRead = await parentClient
    .from("in_app_notices")
    .select("id")
    .eq("student_id", student.id);
  expect(parentRead.data ?? []).toEqual([]);
});
