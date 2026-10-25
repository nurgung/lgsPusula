import { expect, test, type Page } from "@playwright/test";
import {
  createTestAccount,
  isAuthConfigured,
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

function suggestion(page: Page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: "Bugünkü koçun", level: 2 }),
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("a new student gets an invitation, not an academic conclusion", async ({ page }) => {
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Öneri Öğrencisi" });

  await signIn(page, student.username, student.password);
  await expect(page).toHaveURL(/\/ogrenci$/);

  const card = suggestion(page);
  await expect(card.getByRole("heading", { name: "Neden bu öneri?" })).toHaveCount(0);
  await expect(card.getByText(/günlük hedef satırı yok/)).toBeVisible();
  await expect(card.getByText(/küçük bir soru hedefi belirleyebilirsin/)).toBeVisible();
  await expect(card.getByRole("link", { name: "Hedef belirle" })).toHaveAttribute(
    "href",
    "/ogrenci/hedefler",
  );
  await expect(card).not.toContainText(catalog.subjectName);
  await expect(card).not.toContainText("doğruydu");
  await expect(card).not.toContainText("toplam net");
  await expectNoHorizontalOverflow(page);
});

test("a low correct count on enough questions explains the subject suggestion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Tekrar Öğrencisi" });

  await signIn(page, student.username, student.password);
  await expect(page).toHaveURL(/\/ogrenci$/);
  await page.goto("/ogrenci/calisma/yeni");
  await page.getByLabel("Ders").selectOption({ label: catalog.subjectName });
  await page.getByLabel("Soru sayısı").fill("10");
  await page.getByLabel("Doğru").fill("2");
  await page.getByLabel("Yanlış").fill("8");
  await page.getByLabel("Boş").fill("0");
  await page.getByLabel("Süre").fill("20");
  await page.getByRole("button", { name: "Kaydı ekle" }).click();
  await expect(page).toHaveURL(/\/ogrenci\/calisma\?durum=kaydedildi/);

  await page.goto("/ogrenci");
  const card = suggestion(page);
  await expect(
    card.getByText(new RegExp(`${catalog.subjectName} dersinde`)),
  ).toBeVisible();
  await expect(card.getByText(/10 sorudan 2 tanesi doğruydu/)).toBeVisible();
  await card.getByRole("heading", { name: "Neden bu öneri?" }).click();
  await expect(card.getByText(/2 doğru \/ 10 soru/)).toBeVisible();
  await expect(card.getByRole("link", { name: "Çalışma kaydı yaz" })).toHaveAttribute(
    "href",
    "/ogrenci/calisma/yeni",
  );
  await expectNoHorizontalOverflow(page);
});
