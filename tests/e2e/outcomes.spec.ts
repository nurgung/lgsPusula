import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { usernameToAuthEmail } from "../../src/features/auth/username.ts";
import {
  createTestAccount,
  isAuthConfigured,
  localAdminEnv,
  signIn,
  useFreshClientIp,
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

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("maps mistakes to outcomes, ranks priorities, and shows net trend with table", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Kazanım Öğrenci" });
  const other = await createTestAccount({ displayName: "Başka Kazanım" });

  await signIn(page, student.username, student.password);
  await expect(page).toHaveURL(/\/ogrenci$/);

  await page.goto("/ogrenci/kazanimlar");
  await expect(page).toHaveURL(/\/ogrenci\/kazanimlar$/);
  await expect(
    page.getByText("Henüz yanlış veya boş soruyu bir kazanıma bağlamadın"),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/ogrenci/denemeler/gelisim");
  await expect(page).toHaveURL(/\/ogrenci\/denemeler\/gelisim$/);
  await expect(page.getByText("en az iki deneme")).toBeVisible();

  await page.goto("/ogrenci/denemeler/yeni");
  await page.getByLabel("Deneme adı").fill("Birinci deneme");
  await page.getByLabel("Deneme türü").selectOption("branch");
  await page.locator('select[name="branch.subjectId"]').selectOption({
    label: catalog.subjectName,
  });
  await page.locator('input[name="branch.questionCount"]').fill("10");
  await page.locator('input[name="branch.correctCount"]').fill("4");
  await page.locator('input[name="branch.wrongCount"]').fill("4");
  await page.locator('input[name="branch.blankCount"]').fill("2");
  await page.getByRole("button", { name: "Denemeyi kaydet" }).click();
  await expect(page.getByText("Deneme kaydedildi.")).toBeVisible();

  await page.getByRole("link", { name: "Detay / düzenle" }).click();
  await page.getByRole("link", { name: "Yanlış / boş → kazanım" }).click();
  await expect(page.getByRole("heading", { name: "Kazanım eşleştirme" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Yanlış ekle" }).click();
  await page.getByLabel("Ara").fill(catalog.outcomeCode);
  await page.getByRole("radio", { name: new RegExp(catalog.outcomeCode) }).check();
  await page.getByRole("button", { name: "Eşleştirmeleri kaydet" }).click();
  await expect(page.getByText("Kazanım eşleştirmeleri kaydedildi.")).toBeVisible();

  await page.goto("/ogrenci/kazanimlar");
  await expect(page.getByText(catalog.outcomeCode)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Öncelikli kazanımlar tablosu" }),
  ).toBeVisible();

  await page.goto("/ogrenci/denemeler/yeni");
  await page.getByLabel("Deneme adı").fill("İkinci deneme");
  await page.getByLabel("Deneme türü").selectOption("branch");
  await page.locator('select[name="branch.subjectId"]').selectOption({
    label: catalog.subjectName,
  });
  await page.locator('input[name="branch.questionCount"]').fill("10");
  await page.locator('input[name="branch.correctCount"]').fill("7");
  await page.locator('input[name="branch.wrongCount"]').fill("2");
  await page.locator('input[name="branch.blankCount"]').fill("1");
  await page.getByRole("button", { name: "Denemeyi kaydet" }).click();
  await expect(page.getByText("Deneme kaydedildi.")).toBeVisible();

  await page.goto("/ogrenci/denemeler/gelisim");
  await expect(
    page.getByRole("heading", { name: "Denemeler arası toplam net" }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Aralık:", { exact: false })
      .filter({ hasText: "Birim: Toplam net" })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Denemeler arası toplam net tablosu" }),
  ).toBeVisible();
  await expect(page.getByText("Birinci deneme")).toBeVisible();
  await expect(page.getByText("İkinci deneme")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email: usernameToAuthEmail(student.username),
    password: student.password,
  });
  expect(signInError).toBeNull();
  const { data: ownMistakes, error: ownError } = await client
    .from("exam_mistakes")
    .select("id, learning_outcome_id, source, confidence");
  expect(ownError).toBeNull();
  expect(ownMistakes?.length).toBeGreaterThanOrEqual(1);
  expect(ownMistakes?.[0]?.source).toBe("manual");
  expect(ownMistakes?.[0]?.confidence).toBe("high");

  const otherClient = anonClient();
  await otherClient.auth.signInWithPassword({
    email: usernameToAuthEmail(other.username),
    password: other.password,
  });
  const { data: stolen } = await otherClient
    .from("exam_mistakes")
    .select("id")
    .eq("id", ownMistakes![0]!.id);
  expect(stolen ?? []).toEqual([]);
  const { error: writeAsOther } = await otherClient.from("exam_mistakes").insert({
    exam_subject_result_id: randomUUID(),
    learning_outcome_id: catalog.outcomeId,
    mistake_kind: "wrong",
    source: "manual",
    confidence: "high",
    sort_order: 0,
  });
  expect(writeAsOther).not.toBeNull();

  await client.auth.signOut();
  await otherClient.auth.signOut();
});
