import { randomBytes } from "node:crypto";
import { type Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
import {
  E2E_SOURCE_NAME,
  E2E_SOURCE_VERSION,
  E2E_SUBJECT_PREFIX,
  seedCatalog,
  trackE2eSubjectCode,
} from "./support/catalog.ts";
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

async function signedInClient(account: TestAccount): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: usernameToAuthEmail(account.username),
    password: account.password,
  });
  expect(error).toBeNull();
  return client;
}

/** Completes TOTP on the API client, so its session becomes aal2. */
async function verifyTotp(client: SupabaseClient) {
  const { data: enrolled, error } = await client.auth.mfa.enroll({ factorType: "totp" });
  expect(error).toBeNull();
  const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
    factorId: enrolled!.id,
    code: totpCode(enrolled!.totp.secret),
  });
  expect(verifyError).toBeNull();
}

async function readTopicName(topicId: string) {
  const { data } = await admin().from("topics").select("name").eq("id", topicId).single();
  return data?.name as string | undefined;
}

async function outcomeExists(outcomeId: string) {
  const { data } = await admin()
    .from("learning_outcomes")
    .select("id")
    .eq("id", outcomeId);
  return (data ?? []).length === 1;
}

async function expectCannotChange(
  client: SupabaseClient,
  seeded: Awaited<ReturnType<typeof seedCatalog>>,
) {
  const { error: insertError } = await client.from("subjects").insert({
    code: `${E2E_SUBJECT_PREFIX}${randomBytes(4).toString("hex")}`,
    name: "İzinsiz ders",
    source_name: "x",
    source_version: "x",
  });
  expect(insertError).not.toBeNull();

  await client.from("topics").update({ name: "Değiştirildi" }).eq("id", seeded.topicId);
  expect(await readTopicName(seeded.topicId)).toBe(seeded.topicName);

  await client
    .from("learning_outcomes")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", seeded.outcomeId);
  const { data: outcome } = await admin()
    .from("learning_outcomes")
    .select("archived_at")
    .eq("id", seeded.outcomeId)
    .single();
  expect(outcome?.archived_at).toBeNull();

  await client.from("learning_outcomes").delete().eq("id", seeded.outcomeId);
  expect(await outcomeExists(seeded.outcomeId)).toBe(true);
}

test("signed-out visitors cannot read the catalog", async () => {
  const seeded = await seedCatalog();
  const { data } = await anonClient()
    .from("subjects")
    .select("id")
    .eq("id", seeded.subjectId);
  expect(data ?? []).toEqual([]);
  const { data: outcomes } = await anonClient()
    .from("learning_outcomes")
    .select("id")
    .eq("id", seeded.outcomeId);
  expect(outcomes ?? []).toEqual([]);
});

test("students and parents can read the catalog but cannot change it", async () => {
  const seeded = await seedCatalog();
  for (const roles of [["student"], ["parent"]] as const) {
    const account = await createTestAccount({ roles: [...roles] });
    const client = await signedInClient(account);

    const { data: subjects } = await client
      .from("subjects")
      .select("id")
      .eq("id", seeded.subjectId);
    expect(subjects).toHaveLength(1);
    const { data: outcomes } = await client
      .from("learning_outcomes")
      .select("code")
      .eq("id", seeded.outcomeId);
    expect(outcomes?.[0]?.code).toBe(seeded.outcomeCode);

    await expectCannotChange(client, seeded);
    await client.auth.signOut();
  }
});

test("an admin can change the catalog only after TOTP, and never delete or move rows", async () => {
  const seeded = await seedCatalog();
  const account = await createTestAccount({ roles: ["parent", "admin"] });
  const client = await signedInClient(account);

  await expectCannotChange(client, seeded);

  await verifyTotp(client);
  const extraCode = `${E2E_SUBJECT_PREFIX}${randomBytes(4).toString("hex")}`;
  trackE2eSubjectCode(extraCode);
  const { error: insertError } = await client.from("subjects").insert({
    code: extraCode,
    name: "Yönetici dersi",
    source_name: E2E_SOURCE_NAME,
    source_version: E2E_SOURCE_VERSION,
  });
  expect(insertError).toBeNull();

  const renamed = `${seeded.topicName} (düzenlendi)`;
  const { error: updateError } = await client
    .from("topics")
    .update({ name: renamed })
    .eq("id", seeded.topicId);
  expect(updateError).toBeNull();
  expect(await readTopicName(seeded.topicId)).toBe(renamed);

  const other = await seedCatalog();
  const { error: moveError } = await client
    .from("topics")
    .update({ subject_id: other.subjectId })
    .eq("id", seeded.topicId);
  expect(moveError).not.toBeNull();

  await client.from("learning_outcomes").delete().eq("id", seeded.outcomeId);
  expect(await outcomeExists(seeded.outcomeId)).toBe(true);
  await client.auth.signOut();
});

function section(page: Page, heading: string) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: heading, exact: true }),
  });
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("the admin manages the catalog on screen and the student only sees current rows", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const tag = randomBytes(4).toString("hex");
  trackE2eSubjectCode(`${E2E_SUBJECT_PREFIX}${tag}`);
  const subjectName = `E2E Ders ${tag}`;
  const topicName = `E2E Konu ${tag}`;
  const oldCode = `E2E.${tag}.ESKI`;
  const newCode = `E2E.${tag}.YENI`;

  const adminAccount = await createTestAccount({ roles: ["parent", "admin"] });
  await signIn(page, adminAccount.username, adminAccount.password);
  await expect(page).toHaveURL(/\/veli$/);
  await page.goto("/yonetici/mufredat");
  await expect(page).toHaveURL(/\/mfa$/);
  await page.getByRole("button", { name: "Kuruluma başla" }).click();
  const secret = (await page.getByTestId("mfa-secret").innerText()).replace(/\s/g, "");
  await page.getByLabel("Doğrulama kodu").fill(totpCode(secret));
  await page.getByRole("button", { name: "Doğrula" }).click();
  await expect(page).toHaveURL(/\/yonetici$/);

  await page.getByRole("link", { name: "Müfredatı aç" }).click();
  await expect(page.getByRole("heading", { name: "Müfredat", level: 1 })).toBeVisible();
  await expectNoOverflow(page);

  const addSubject = section(page, "Ders ekle");
  await addSubject.getByRole("button", { name: "Dersi ekle" }).click();
  await expect(addSubject.getByRole("alert")).toContainText("Ders kodunu yaz.");

  await addSubject.getByLabel("Ders kodu").fill(`${E2E_SUBJECT_PREFIX}${tag}`);
  await addSubject.getByLabel("Ders adı").fill(subjectName);
  await addSubject.getByLabel("Kaynak adı").fill(E2E_SOURCE_NAME);
  await addSubject.getByLabel("Kaynak sürümü").fill(E2E_SOURCE_VERSION);
  await addSubject.getByRole("button", { name: "Dersi ekle" }).click();
  await expect(addSubject.getByText("Ders eklendi.")).toBeVisible();

  await page.getByRole("link", { name: `${subjectName} dersini düzenle` }).click();
  await expect(page.getByRole("heading", { name: subjectName, level: 1 })).toBeVisible();

  const addTopic = section(page, "Konu ekle");
  await expect(addTopic.getByLabel("Kaynak sürümü")).toHaveValue("e2e");
  await addTopic.getByLabel("Konu adı").fill(topicName);
  await addTopic.getByRole("button", { name: "Konuyu ekle" }).click();
  await expect(addTopic.getByText("Konu eklendi.")).toBeVisible();

  const topicCard = section(page, topicName);
  await topicCard.getByText("Kazanım ekle", { exact: true }).click();
  for (const [code, description] of [
    [oldCode, "Eskiyen kurgusal kazanım"],
    [newCode, "Güncel kurgusal kazanım"],
  ] as const) {
    await topicCard.getByLabel("Kazanım kodu").last().fill(code);
    await topicCard.getByLabel("Kazanım açıklaması").last().fill(description);
    await topicCard.getByRole("button", { name: "Kazanımı ekle" }).click();
    await expect(topicCard.getByText(code, { exact: true })).toBeVisible();
  }

  const oldItem = topicCard.getByRole("listitem").filter({ hasText: oldCode });
  await oldItem.getByText("Kazanımı düzenle", { exact: true }).click();
  await oldItem.getByRole("button", { name: `Eski sürüm yap: ${oldCode}` }).click();
  await expect(oldItem.getByText("Eski sürüm olarak işaretlendi.")).toBeVisible();
  await expect(oldItem.getByText("Eski sürüm", { exact: true })).toBeVisible();
  await expectNoOverflow(page);

  const studentAccount = await createTestAccount();
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await useFreshClientIp(studentPage);
  await signIn(studentPage, studentAccount.username, studentAccount.password);
  await expect(studentPage).toHaveURL(/\/ogrenci$/);

  await studentPage.goto("/yonetici/mufredat");
  await expect(studentPage.getByText("Aradığın sayfa bulunamadı")).toBeVisible();

  await studentPage.goto("/ogrenci/konular");
  await studentPage.getByRole("searchbox", { name: /Ara/ }).fill(tag);
  await expect(
    studentPage.getByRole("radio", { name: new RegExp(`Konu: ${topicName}`) }),
  ).toBeVisible();
  await expect(
    studentPage.getByRole("radio", { name: new RegExp(newCode.replace(/\./g, "\\.")) }),
  ).toBeVisible();
  await expect(studentPage.getByText(oldCode)).toHaveCount(0);

  await studentPage
    .getByRole("radio", { name: new RegExp(`Konu: ${topicName}`) })
    .check();
  await expect(
    studentPage.getByRole("heading", { name: topicName, level: 2 }),
  ).toBeVisible();
  await expectNoOverflow(studentPage);
  await studentContext.close();

  const { data: events } = await admin()
    .from("audit_events")
    .select("outcome, metadata")
    .eq("actor_id", adminAccount.id)
    .eq("event_type", "admin.catalog_change");
  expect(events?.filter((event) => event.outcome === "success")).toHaveLength(5);
  expect(JSON.stringify(events)).not.toContain(tag);
});
