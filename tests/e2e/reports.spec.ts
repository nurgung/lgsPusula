import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { type Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { createClient } from "@supabase/supabase-js";
import { usernameToAuthEmail } from "../../src/features/auth/username.ts";
import { MIN_PDF_BYTES } from "../../src/features/reports/constants.ts";
import { pdfContainsText } from "../../src/features/reports/pdf-text.ts";
import { weeklyReportWindow } from "../../src/features/reports/periods.ts";
import { istanbulToday } from "../../src/features/study/calendar.ts";
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
  const { error: approveError } = await admin().rpc("respond_family_link", {
    p_actor_id: studentId,
    p_link_id: link?.id,
    p_decision: "approve",
  });
  expect(approveError).toBeNull();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

function paddedPdf(): string {
  const bytes = Buffer.alloc(MIN_PDF_BYTES, 0x20);
  bytes.write("%PDF-1.4");
  return `\\x${bytes.toString("hex")}`;
}

test("a linked parent sees weekly and monthly totals and downloads a Turkish PDF", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Şişli Öğrencisi" });
  const parent = await createTestAccount({
    roles: ["parent"],
    displayName: "Veli",
  });
  const stranger = await createTestAccount({
    roles: ["parent"],
    displayName: "Başka Veli",
  });
  await activateLink(student.id, parent.id);
  const { error: logError } = await admin().from("study_logs").insert({
    student_id: student.id,
    studied_on: istanbulToday(),
    subject_id: catalog.subjectId,
    question_count: 4,
    correct_count: 2,
    wrong_count: 1,
    blank_count: 1,
    duration_minutes: 15,
    request_id: randomUUID(),
  });
  expect(logError).toBeNull();

  await signIn(page, parent.username, parent.password);
  await expect(page).toHaveURL(/\/veli$/);
  await expect(page.getByRole("heading", { name: "Şişli Öğrencisi" })).toBeVisible();
  await expect(page.getByText("Bu hafta 4 soru, 15 dakika.")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Öğrenciyi gör" }).click();
  await expect(
    page.getByRole("heading", { name: "Bu hafta", exact: true, level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bu ay", exact: true, level: 2 }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bugünkü koçun" })).toBeVisible();
  await expect(
    page.getByText("Kayıtları yalnızca öğrenci değiştirebilir."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Hedef belirle" })).toHaveCount(0);
  await expect(page.getByText("4 soru").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const [download, response] = await Promise.all([
    page.waitForEvent("download"),
    page.waitForResponse(
      (item) => item.url().includes("/veli/rapor/") && item.request().method() === "GET",
    ),
    page.getByRole("button", { name: "Bu haftanın raporunu indir" }).click(),
  ]);
  expect(response.headers()["content-type"]).toContain("application/pdf");
  expect(response.headers()["content-disposition"]).toContain("attachment");
  expect(download.suggestedFilename()).toBe("lgs-pusula-haftalik-rapor.pdf");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const body = new Uint8Array(readFileSync(downloadPath ?? ""));
  expect(Buffer.from(body.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
  expect(body.byteLength).toBeGreaterThan(MIN_PDF_BYTES);
  expect(pdfContainsText(body, "Şişli")).toBe(true);
  expect(pdfContainsText(body, "İstanbul")).toBe(true);
  expect(pdfContainsText(body, catalog.subjectName)).toBe(true);

  const reportUrl = download.url();
  const jobId = reportUrl.split("/").pop()?.split("?")[0] ?? "";

  const parentClient = await signInClient(parent);
  const hiddenBytes = await parentClient
    .from("report_jobs")
    .select("pdf_bytes")
    .eq("id", jobId);
  expect(hiddenBytes.error).not.toBeNull();
  const visible = await parentClient
    .from("report_jobs")
    .select("id, status, storage_kind")
    .eq("id", jobId);
  expect(visible.error).toBeNull();
  expect(visible.data).toEqual([
    { id: jobId, status: "ready", storage_kind: "database" },
  ]);

  const studentClient = await signInClient(student);
  const studentRead = await studentClient
    .from("report_jobs")
    .select("id")
    .eq("id", jobId);
  expect(studentRead.data).toEqual([]);
  const studentWrite = await studentClient.from("report_jobs").insert({
    student_id: student.id,
    requested_by: parent.id,
    report_type: "weekly_pdf",
    period_from: "2026-10-12",
    period_to: "2026-10-18",
    status: "failed",
    byte_size: 0,
    failure_code: "empty_document",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  expect(studentWrite.error).not.toBeNull();

  await page.context().clearCookies();
  await signIn(page, stranger.username, stranger.password);
  await expect(page).toHaveURL(/\/veli$/);
  const denied = await page.goto(reportUrl);
  expect(denied?.headers()["content-type"] ?? "").not.toContain("application/pdf");
  await expect(page.getByRole("heading", { name: "Rapor indirilemedi" })).toBeVisible();
  await expect(page.getByText("Boş dosya gönderilmedi.")).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, parent.username, parent.password);
  await expect(page).toHaveURL(/\/veli$/);
  await page.goto(`/veli/ogrenci/${student.id}`);
  await page.getByRole("button", { name: "Bağlantıyı kaldır" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Bağlantıyı kaldır" })
    .click();
  await expect(page.getByText("Bağlantı kaldırıldı.")).toBeVisible();
  const revoked = await page.goto(reportUrl);
  expect(revoked?.headers()["content-type"] ?? "").not.toContain("application/pdf");
  await expect(page.getByText("Boş dosya gönderilmedi.")).toBeVisible();
});

test("an expired or failed report is not a file, and expiry deletes the row", async ({
  page,
}) => {
  const student = await createTestAccount({ displayName: "Rapor Öğrencisi" });
  const parent = await createTestAccount({
    roles: ["parent"],
    displayName: "Rapor Velisi",
  });
  await activateLink(student.id, parent.id);
  const previous = weeklyReportWindow(istanbulToday(), "previous");
  const { data: failed, error: failedError } = await admin()
    .from("report_jobs")
    .insert({
      student_id: student.id,
      requested_by: parent.id,
      report_type: "weekly_pdf",
      period_from: previous.from,
      period_to: previous.to,
      status: "failed",
      pdf_bytes: null,
      byte_size: 0,
      failure_code: "empty_document",
      storage_kind: "database",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    })
    .select("id")
    .single<{ id: string }>();
  expect(failedError).toBeNull();

  await signIn(page, parent.username, parent.password);
  await expect(page).toHaveURL(/\/veli$/);
  const failedResponse = await page.goto(`/veli/rapor/${failed?.id}`);
  expect(failedResponse?.headers()["content-type"] ?? "").toContain("text/html");
  expect(failedResponse?.headers()["content-disposition"] ?? "").not.toContain(
    "attachment",
  );
  await expect(page.getByText("Boş dosya gönderilmedi.")).toBeVisible();

  const { data: expired, error: expiredError } = await admin()
    .from("report_jobs")
    .insert({
      student_id: student.id,
      requested_by: parent.id,
      report_type: "weekly_pdf",
      period_from: "2026-09-07",
      period_to: "2026-09-13",
      status: "ready",
      pdf_bytes: paddedPdf(),
      byte_size: MIN_PDF_BYTES,
      failure_code: null,
      storage_kind: "database",
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    })
    .select("id")
    .single<{ id: string }>();
  expect(expiredError).toBeNull();

  await page.goto("/veli");
  const { data: remaining, error: remainingError } = await admin()
    .from("report_jobs")
    .select("id")
    .eq("id", expired?.id ?? "");
  expect(remainingError).toBeNull();
  expect(remaining).toEqual([]);
});
