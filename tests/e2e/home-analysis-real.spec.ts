import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { type Page } from "@playwright/test";
import { istanbulToday, addCalendarDays } from "../../src/features/study/calendar.ts";
import { expect, test } from "./support/fixtures.ts";
import {
  admin,
  createTestAccount,
  isAuthConfigured,
  signIn,
  useFreshClientIp,
} from "./support/auth.ts";

/**
 * Faz 5 on the real `/ogrenci` page with a fictional student and fictional exams written
 * to the local test database only. Screenshots go to test-results/faz5-real.
 */
test.skip(
  !isAuthConfigured(),
  "Supabase is not configured (see README: yerel Supabase).",
);

const SHOTS = "test-results/faz5-real";
const SIZES = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "320x568", width: 320, height: 568 },
] as const;

type SeedExam = {
  title: string;
  daysAgo: number;
  net: number;
  score: number | null;
  type?: "lgs_full" | "branch";
};

/** Rows are inserted in order, so a later row has a later created_at (same-day tie-break). */
async function seedExams(studentId: string, exams: readonly SeedExam[]) {
  const today = istanbulToday();
  for (const exam of exams) {
    const { error } = await admin()
      .from("exams")
      .insert({
        student_id: studentId,
        title: exam.title,
        taken_on: addCalendarDays(today, -exam.daysAgo),
        exam_type: exam.type ?? "lgs_full",
        rule_version: "lgs-v1",
        total_net: exam.net,
        score: exam.score,
        request_id: randomUUID(),
      });
    expect(error).toBeNull();
  }
}

async function pageOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Sizes are set by this file.");
  mkdirSync(SHOTS, { recursive: true });
});

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("several exams: charts, metrics and no horizontal overflow", async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const student = await createTestAccount({ displayName: "Analiz Öğrenci" });
      await seedExams(student.id, [
        { title: "Eylül denemesi", daysAgo: 30, net: 44.25, score: 389 },
        { title: "Ekim 1", daysAgo: 21, net: 48.5, score: 401.5 },
        { title: "Ekim 2", daysAgo: 14, net: 57, score: 426 },
        // Same day, saved one after the other: the second row is the latest.
        { title: "Ekim 3 sabah", daysAgo: 7, net: 55.3333, score: 421.75 },
        { title: "Ekim 3 akşam", daysAgo: 7, net: 52.6667, score: 418 },
      ]);
      await useFreshClientIp(page);
      await signIn(page, student.username, student.password);
      await expect(page).toHaveURL(/\/ogrenci$/);

      const card = page.getByRole("heading", { name: "Deneme Analizi" });
      await expect(card).toBeVisible();
      await expect(page.getByTestId("latest-score")).toHaveText("418");
      await expect(page.getByRole("img", { name: /Puan gelişimi/ })).toBeVisible();
      await expect(page.getByRole("img", { name: /Net gelişimi/ })).toBeVisible();
      // 418 − 421,75 = −3,75; 52,67 − 55,33 = −2,66 (two-decimal values the student sees).
      await expect(page.getByText("−3,75")).toBeVisible();
      await expect(page.getByText("−2,66")).toBeVisible();
      await expect(page.getByText(/Önceki denemeye göre \(Ekim 3 sabah,/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Son deneme" })).toBeVisible();

      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `${SHOTS}/${size.name}-viewport.png` });
      await page.screenshot({ path: `${SHOTS}/${size.name}-full.png`, fullPage: true });
      // Two viewport-sized shots of the card, so the fixed bottom menu never covers it.
      await card.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.evaluate(() => window.scrollBy(0, -16));
      await page.screenshot({ path: `${SHOTS}/${size.name}-analysis-1.png` });
      await page.evaluate((step) => window.scrollBy(0, step), size.height - 140);
      await page.screenshot({ path: `${SHOTS}/${size.name}-analysis-2.png` });
      await page
        .getByRole("heading", { name: "Özet", exact: true })
        .locator("xpath=..")
        .screenshot({ path: `${SHOTS}/${size.name}-band.png` });
    });
  });
}

test.describe("states on the real page", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no exam: short empty state and no chart", async ({ page }) => {
    const student = await createTestAccount({ displayName: "Boş Öğrenci" });
    await useFreshClientIp(page);
    await signIn(page, student.username, student.password);
    await expect(page).toHaveURL(/\/ogrenci$/);
    await expect(page.getByRole("heading", { name: "Deneme Analizi" })).toBeVisible();
    await expect(page.getByText("Henüz deneme kaydın yok.")).toHaveCount(1);
    await expect(page.getByRole("img", { name: /gelişimi/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Son deneme" })).toHaveCount(0);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/390x844-empty-full.png`, fullPage: true });
  });

  test("one exam: one point per chart and no comparison", async ({ page }) => {
    const student = await createTestAccount({ displayName: "Tek Deneme" });
    await seedExams(student.id, [
      { title: "İlk deneme", daysAgo: 3, net: 40, score: 380 },
    ]);
    await useFreshClientIp(page);
    await signIn(page, student.username, student.password);
    await expect(page.getByTestId("latest-score")).toHaveText("380");
    await expect(page.getByText(/Tek kayıt var/)).toHaveCount(2);
    await expect(page.getByText("Puan farkı")).toHaveCount(0);
    await expect(page.getByText(/aynı türden bir deneme daha gerekir/)).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/390x844-single-full.png`, fullPage: true });
  });

  test("score missing on the latest exam: net stays, score change says Veri yok", async ({
    page,
  }) => {
    const student = await createTestAccount({ displayName: "Puansız" });
    await seedExams(student.id, [
      { title: "Önceki", daysAgo: 10, net: 45, score: 400 },
      { title: "Son", daysAgo: 2, net: 50, score: null },
    ]);
    await useFreshClientIp(page);
    await signIn(page, student.username, student.password);
    await expect(page.getByText("Puan kaydı yok")).toBeVisible();
    await expect(page.getByTestId("latest-score")).toHaveCount(0);
    await expect(page.getByText("+5,00")).toBeVisible();
    const analysisCard = page
      .getByRole("heading", { name: "Deneme Analizi" })
      .locator("xpath=ancestor::section[1]");
    await expect(analysisCard.getByText("Veri yok")).toHaveCount(1);
    await page.screenshot({ path: `${SHOTS}/390x844-noscore-full.png`, fullPage: true });
  });

  test("exams of two types are not mixed in one comparison", async ({ page }) => {
    const student = await createTestAccount({ displayName: "Karışık" });
    await seedExams(student.id, [
      { title: "Tam eski", daysAgo: 12, net: 50, score: 400 },
      { title: "Branş", daysAgo: 6, net: 12, score: null, type: "branch" },
      { title: "Tam yeni", daysAgo: 1, net: 58, score: 415 },
    ]);
    await useFreshClientIp(page);
    await signIn(page, student.username, student.password);
    await expect(page.getByText(/Önceki denemeye göre \(Tam eski,/)).toBeVisible();
    await expect(page.getByText("+15")).toBeVisible();
    await expect(page.getByText(/1 deneme farklı türde/)).toBeVisible();
  });
});
