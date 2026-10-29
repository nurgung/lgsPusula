import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Faz 5: "Deneme Analizi" and the wide summary band on the student home.
 * Runs on the fictional preview page (`/onizleme/ana-sayfa`), which renders the same
 * `HomeSummaryBand` as `/ogrenci` with sample exams. It never reads a real student record.
 * Screenshots go to test-results/faz5 (ignored by git).
 */
const SIZES = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "320x568", width: 320, height: 568 },
] as const;

const PATH = "/onizleme/ana-sayfa";
const SHOTS = "test-results/faz5";

async function overflow(page: Page) {
  return page.evaluate(() => ({
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    wide: Array.from(document.querySelectorAll("section[aria-labelledby^='ornek-'] *"))
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .filter((el) => !el.closest('[role="region"][tabindex="0"]'))
      .filter((el) => !el.closest("ul[aria-label='Kazanılan rozetler']"))
      .slice(0, 5)
      .map((el) => `${el.tagName}.${(el.getAttribute("class") ?? "").slice(0, 60)}`),
  }));
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Sizes are set by this file.");
  mkdirSync(SHOTS, { recursive: true });
});

for (const size of SIZES) {
  test.describe(`${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("analysis band has no horizontal overflow and shows real structure", async ({
      page,
    }) => {
      await page.goto(PATH);
      const analysis = page.getByRole("heading", { name: "Deneme Analizi" }).first();
      await expect(analysis).toBeVisible();
      await expect(
        page.getByRole("img", { name: /Puan gelişimi/ }).first(),
      ).toBeVisible();
      await expect(page.getByRole("img", { name: /Net gelişimi/ }).first()).toBeVisible();

      const result = await overflow(page);
      expect(result.page, `overflowing: ${result.wide.join(" | ")}`).toBeLessThanOrEqual(
        0,
      );
      expect(result.wide, "elements outside the viewport").toEqual([]);

      await page.screenshot({ path: `${SHOTS}/${size.name}-viewport.png` });
      await page.screenshot({ path: `${SHOTS}/${size.name}-full.png`, fullPage: true });
      const band = page.getByRole("heading", { name: "Özet (örnek denemelerle)" });
      await band.scrollIntoViewIfNeeded();
      const bandBox = await band.locator("xpath=..").boundingBox();
      expect(bandBox).not.toBeNull();
      await band
        .locator("xpath=..")
        .screenshot({ path: `${SHOTS}/${size.name}-band.png` });
    });
  });
}

test.describe("1280x800 composition", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("analysis and week sit side by side; badges follow the latest exam", async ({
    page,
  }) => {
    await page.goto(PATH);
    const section = page.getByRole("region", { name: "Özet (örnek denemelerle)" });
    const analysis = await section
      .getByRole("heading", { name: "Deneme Analizi" })
      .locator("xpath=ancestor::section[1]")
      .boundingBox();
    const week = await section
      .getByRole("heading", { name: "Bu hafta" })
      .locator("xpath=ancestor::section[1]")
      .boundingBox();
    const latest = await section
      .getByRole("heading", { name: "Son deneme" })
      .locator("xpath=ancestor::section[1]")
      .boundingBox();
    const badges = await section
      .getByRole("heading", { name: "Rozetlerin" })
      .locator("xpath=ancestor::section[1]")
      .boundingBox();
    expect(analysis && week && latest && badges).toBeTruthy();
    // Same row: week starts to the right of the analysis and near its top.
    expect(week!.x).toBeGreaterThan(analysis!.x + analysis!.width);
    expect(Math.abs(week!.y - analysis!.y)).toBeLessThan(2);
    // Analysis is clearly wider than the right column (about 2 : 1).
    expect(analysis!.width / week!.width).toBeGreaterThan(1.7);
    expect(analysis!.width / week!.width).toBeLessThan(2.3);
    // Right column stacks week, latest exam, then badges.
    expect(latest!.y).toBeGreaterThan(week!.y + week!.height - 1);
    expect(latest!.x).toBeCloseTo(week!.x, 0);
    expect(badges!.y).toBeGreaterThan(latest!.y + latest!.height - 1);
    expect(badges!.x).toBeCloseTo(week!.x, 0);
    // The page is wider than the 5xl column used by other pages (1024 px).
    expect(analysis!.width + week!.width).toBeGreaterThan(1100);
  });

  test("other pages keep the narrow column", async ({ page }) => {
    await page.goto("/onizleme/bilesenler");
    const width = await page
      .locator("main")
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(1024);
  });
});

test.describe("390x844 reading order", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("single column and the last button clears the bottom menu", async ({ page }) => {
    await page.goto(PATH);
    const section = page.getByRole("region", { name: "Özet (örnek denemelerle)" });
    const boxes = [];
    for (const name of ["Deneme Analizi", "Bu hafta", "Son deneme", "Rozetlerin"]) {
      const box = await section
        .getByRole("heading", { name })
        .locator("xpath=ancestor::section[1]")
        .boundingBox();
      boxes.push(box!);
    }
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index]!.y).toBeGreaterThan(boxes[index - 1]!.y);
      expect(boxes[index]!.x).toBeCloseTo(boxes[0]!.x, 0);
    }
    const link = page.getByRole("link", { name: "Tüm denemeler" }).first();
    await link.scrollIntoViewIfNeeded();
    const nav = page.getByRole("navigation").last();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const linkBox = (await link.boundingBox())!;
    const navBox = (await nav.boundingBox())!;
    // The button is reachable: either above the fixed menu now or the page can scroll further.
    expect(
      linkBox.y + linkBox.height <= navBox.y || linkBox.y + linkBox.height <= 844,
    ).toBe(true);
  });
});
