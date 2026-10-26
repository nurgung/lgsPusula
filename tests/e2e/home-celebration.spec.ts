import { type Page } from "@playwright/test";
import { expect, test } from "./support/fixtures.ts";
import { istanbulToday } from "../../src/features/study/calendar.ts";
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
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function fillLog(page: Page, subjectName: string, questions: string) {
  await page.goto("/ogrenci/calisma/yeni");
  await page.getByLabel("Tarih").fill(istanbulToday());
  await page.getByLabel("Ders").selectOption({ label: subjectName });
  await page.getByLabel("Soru sayısı").fill(questions);
  await page.getByLabel("Doğru").fill(questions);
  await page.getByLabel("Yanlış").fill("0");
  await page.getByLabel("Boş").fill("0");
  await page.getByLabel("Süre").fill("10");
  await page.getByRole("button", { name: "Kaydı ekle" }).click();
}

test("a goal crossing opens once, a later save stays quiet, and Escape closes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const catalog = await seedCatalog();
  const student = await createTestAccount({ displayName: "Kutlama Öğrencisi" });

  await signIn(page, student.username, student.password);
  await expect(page).toHaveURL(/\/ogrenci$/);
  await page.goto("/ogrenci/hedefler");
  await page.getByRole("textbox", { name: "Hedef", exact: true }).fill("5");
  await page.getByRole("button", { name: "Hedefi kaydet" }).click();
  await expect(page.getByText("Hedefin kaydedildi.")).toBeVisible();

  await fillLog(page, catalog.subjectName, "5");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByText("Bugünkü soru hedefin tamam.")).toBeVisible();
  await expect(dialog.getByText("Madalya")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Tamam" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const confettiDisplay = await dialog
    .locator(".celebration-confetti")
    .first()
    .evaluate((element) => getComputedStyle(element).display);
  expect(confettiDisplay).toBe("none");
  const motion = await dialog
    .locator("[data-stage-current]")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(motion).toBe("none");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).not.toHaveURL(/kutlama=/);
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await fillLog(page, catalog.subjectName, "1");
  await expect(page.getByText("Çalışma kaydın eklendi.")).toBeVisible();
  await expect(page).not.toHaveURL(/kutlama=/);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/ogrenci");
  await expect(page.getByRole("heading", { name: "Aşama yolun" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bugünün hedefleri" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dersler" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Özet" })).toBeVisible();
  for (const name of ["Yeni arkadaş", "Alışıyor", "Birlikte büyüyor", "Yol arkadaşı"]) {
    await expect(page.getByText(name).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: catalog.subjectName })).toHaveAttribute(
    "href",
    new RegExp(`/ogrenci/calisma/yeni\\?ders=`),
  );
  await expect(page.getByText("6 / 5 soru", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
