import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Faz 6: the student home at 1280x800, 390x844 and 320x568.
 * Runs on `/onizleme/ogrenci`, which renders `StudentHomeView` (the same component as
 * `/ogrenci`) with fictional values, so no real record is read and no account is needed.
 * Screenshots go to test-results/faz6 (ignored by git). Set FAZ6_SHOTS to write elsewhere,
 * for example to keep a "before" set.
 */
const SIZES = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "320x568", width: 320, height: 568 },
] as const;

const PATH = "/onizleme/ogrenci";
const SHOTS = process.env.FAZ6_SHOTS ?? "test-results/faz6";

type Measure = {
  pageOverflow: number;
  outside: string[];
  clipped: string[];
  spill: string[];
  navHeight: number;
  mainPaddingBottom: number;
};

/** Page-level overflow, elements sticking out of the viewport and text cut by a clamp. */
async function measure(page: Page): Promise<Measure> {
  return page.evaluate(() => {
    const width = window.innerWidth;
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 50)}`;
    const insideScroller = (el: Element) =>
      Boolean(
        el.closest("[role='region'][tabindex='0'], ul[aria-label='Kazanılan rozetler']"),
      );
    // Decorative drawings may be larger than the box that clips them; that is not overflow.
    const clippedByAncestor = (el: Element) => {
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.overflowX !== "visible") {
          const box = parent.getBoundingClientRect();
          if (box.left >= -1 && box.right <= width + 1) return true;
        }
      }
      return false;
    };
    const outside = Array.from(document.querySelectorAll("main *, header *"))
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && (box.right > width + 1 || box.left < -1);
      })
      .filter(
        (el) => !insideScroller(el) && !el.closest(".sr-only") && !clippedByAncestor(el),
      )
      .slice(0, 8)
      .map(describe);
    // Text that is wider than its own box and spills over the edge of the card around it.
    const spill = Array.from(document.querySelectorAll("main *"))
      .filter((el) => !(el instanceof SVGElement) && !insideScroller(el))
      .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
      .filter((el) => getComputedStyle(el).overflowX === "visible")
      .slice(0, 8)
      .map((el) => `${describe(el)}: ${(el.textContent ?? "").trim().slice(0, 40)}`);
    const clipped = Array.from(document.querySelectorAll("main *"))
      .filter((el) => {
        const style = getComputedStyle(el);
        const clamps =
          style.webkitLineClamp !== "none" || style.textOverflow === "ellipsis";
        return clamps && el.scrollHeight > el.clientHeight + 1;
      })
      .slice(0, 8)
      .map((el) => `${describe(el)}: ${(el.textContent ?? "").trim().slice(0, 40)}`);
    const nav = document.querySelector("nav[aria-label='Ana menü'].fixed");
    return {
      pageOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      outside,
      clipped,
      spill,
      navHeight: nav ? nav.getBoundingClientRect().height : 0,
      mainPaddingBottom: parseFloat(
        getComputedStyle(document.querySelector("main")!).paddingBottom,
      ),
    };
  });
}

/**
 * The Next.js dev badge and the sample-page banner are not part of `/ogrenci`. They are
 * hidden so the first screen matches the real page. (The banner is only in the preview layout.)
 */
async function hideDevChrome(page: Page) {
  await page.addStyleTag({
    content:
      "nextjs-portal, [aria-label='Önizleme uyarısı'] { display: none !important; }",
  });
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Sizes are set by this file.");
  mkdirSync(SHOTS, { recursive: true });
});

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("screenshots, no overflow, no clipped text", async ({ page }) => {
      await page.goto(PATH);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Deneme Analizi" })).toBeVisible();
      await hideDevChrome(page);

      await page.screenshot({ path: `${SHOTS}/${size.name}-viewport.png` });
      await page.screenshot({ path: `${SHOTS}/${size.name}-full.png`, fullPage: true });

      // Reading-order slices (one viewport each) for visual review.
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const step = size.height - 80;
      for (let index = 0, y = 0; y < total; index++, y += step) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.screenshot({
          path: `${SHOTS}/${size.name}-part-${String(index + 1).padStart(2, "0")}.png`,
        });
      }

      const result = await measure(page);
      expect(result.pageOverflow, result.outside.join(" | ")).toBeLessThanOrEqual(0);
      expect(result.outside, "elements outside the viewport").toEqual([]);
      expect(result.clipped, "text cut off by a line clamp").toEqual([]);
      expect(result.spill, "text wider than its box").toEqual([]);
    });
  });
}

test.describe("320x568 reading order and fixed menu", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("title, stage, coach and first action come in order; last content clears the menu", async ({
    page,
  }) => {
    await page.goto(PATH);
    const order = [
      page.getByRole("heading", { level: 1 }),
      page.getByText("Şu anki aşama"),
      page.getByRole("heading", { name: "Bugünkü koçun" }),
      page.getByRole("heading", { name: "Bugünün hedefleri" }),
      page.getByRole("heading", { name: "Dersler" }),
      page.getByRole("heading", { name: "Deneme Analizi" }),
    ];
    let previousTop = -Infinity;
    for (const locator of order) {
      const box = await locator.first().boundingBox();
      expect(box, "section is rendered").not.toBeNull();
      expect(box!.y).toBeGreaterThan(previousTop);
      previousTop = box!.y;
    }

    // Everything is reachable: scroll to the end and the last card is above the menu.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const nav = page.locator("nav[aria-label='Ana menü'].fixed");
    const navBox = (await nav.boundingBox())!;
    const lastCard = page.locator("main section").last();
    const lastBox = (await lastCard.boundingBox())!;
    expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(navBox.y);
  });

  test("the fixed menu leaves room for content and never covers a focused control", async ({
    page,
  }) => {
    await page.goto(PATH);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await hideDevChrome(page);
    const result = await measure(page);
    expect(result.navHeight).toBeGreaterThan(0);
    expect(result.navHeight).toBeLessThanOrEqual(64);
    expect(result.mainPaddingBottom).toBeGreaterThanOrEqual(result.navHeight + 16);

    // Walk the page with the keyboard: every focused control stays above the fixed menu
    // until focus reaches the menu itself (WCAG 2.2 Focus Not Obscured).
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    let visited = 0;
    for (let step = 0; step < 120; step++) {
      await page.keyboard.press("Tab");
      const state = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const nav = document.querySelector("nav[aria-label='Ana menü'].fixed")!;
        const box = el.getBoundingClientRect();
        return {
          inMenu: nav.contains(el),
          bottom: box.bottom,
          menuTop: nav.getBoundingClientRect().top,
          name: (el.textContent ?? el.getAttribute("aria-label") ?? "")
            .trim()
            .slice(0, 30),
        };
      });
      if (state.inMenu) break;
      visited++;
      expect(state.bottom, `menu covers "${state.name}"`).toBeLessThanOrEqual(
        state.menuTop + 0.5,
      );
    }
    expect(visited, "the walk reached many controls").toBeGreaterThan(15);

    // At the very end of the page the last button clears the menu with room to spare.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const last = (await page.getByRole("button", { name: "Veli bağla" }).boundingBox())!;
    const menu = (await page.locator("nav[aria-label='Ana menü'].fixed").boundingBox())!;
    expect(menu.y - (last.y + last.height)).toBeGreaterThanOrEqual(16);
  });

  test("bottom menu links go to their pages and mark the current one", async ({
    page,
  }) => {
    await page.goto(PATH);
    await hideDevChrome(page);
    const nav = page.locator("nav[aria-label='Ana menü'].fixed");
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(nav.getByRole("link", { name: "Öğrenci" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await nav.getByRole("link", { name: "Bileşenler" }).click();
    await expect(page).toHaveURL(/\/onizleme\/bilesenler$/);
    await expect(nav.getByRole("link", { name: "Bileşenler" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Öğrenci" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
    await nav.getByRole("link", { name: "Öğrenci" }).click();
    await expect(page).toHaveURL(/\/onizleme\/ogrenci$/);
  });
});

test.describe("390x844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("one column in reading order; chart labels stay inside the card", async ({
    page,
  }) => {
    await page.goto(PATH);
    const names = ["Bugünkü koçun", "Bugünün hedefleri", "Dersler", "Deneme Analizi"];
    const lefts: number[] = [];
    let previousTop = -Infinity;
    for (const name of names) {
      const section = page
        .getByRole("heading", { name })
        .first()
        .locator("xpath=ancestor::section[1]");
      const box = (await section.boundingBox())!;
      expect(box.y).toBeGreaterThan(previousTop);
      previousTop = box.y;
      lefts.push(box.x);
    }
    expect(new Set(lefts.map((left) => Math.round(left))).size).toBe(1);

    for (const name of [/Puan gelişimi/, /Net gelişimi/]) {
      const chart = page.getByRole("img", { name }).first();
      const box = (await chart.boundingBox())!;
      const card = (await page
        .getByRole("heading", { name: "Deneme Analizi" })
        .locator("xpath=ancestor::section[1]")
        .boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(card.x);
      expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width + 1);
      // The smallest SVG text (12 user units) must stay readable once scaled.
      const textSize = await chart.evaluate((svg) => {
        const text = svg.querySelector("text")!;
        const matrix = text.getScreenCTM()!;
        return parseFloat(getComputedStyle(text).fontSize) * matrix.a;
      });
      expect(textSize).toBeGreaterThanOrEqual(11);
    }
  });
});

test.describe("1280x800 composition", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("keeps the desktop layout: inline menu, goals beside lessons, 2:1 summary", async ({
    page,
  }) => {
    await page.goto(PATH);
    await expect(page.locator("nav.fixed")).toBeHidden();
    const top = page.locator("header").getByRole("navigation", { name: "Ana menü" });
    await expect(top).toBeVisible();
    const topLinks = top.getByRole("link");
    expect(await topLinks.count()).toBe(5);
    const firstY = (await topLinks.first().boundingBox())!.y;
    const lastY = (await topLinks.last().boundingBox())!.y;
    expect(Math.abs(firstY - lastY)).toBeLessThan(2);

    const goals = (await page
      .getByRole("heading", { name: "Bugünün hedefleri" })
      .first()
      .locator("xpath=ancestor::section[1]")
      .boundingBox())!;
    const lessons = (await page
      .getByRole("heading", { name: "Dersler" })
      .locator("xpath=ancestor::section[1]")
      .boundingBox())!;
    expect(lessons.x).toBeGreaterThan(goals.x + goals.width - 1);
    expect(Math.abs(lessons.y - goals.y)).toBeLessThan(2);

    const analysis = (await page
      .getByRole("heading", { name: "Deneme Analizi" })
      .locator("xpath=ancestor::section[1]")
      .boundingBox())!;
    const week = (await page
      .getByRole("heading", { name: "Bu hafta" })
      .locator("xpath=ancestor::section[1]")
      .boundingBox())!;
    expect(analysis.width / week.width).toBeGreaterThan(1.7);
    expect(analysis.width / week.width).toBeLessThan(2.3);
    expect(Math.abs(analysis.y - week.y)).toBeLessThan(2);

    // The stage path is a four-column row on desktop.
    const stops = await page.locator("[data-stage-current]").evaluate((el) => {
      const list = el.closest("ol")!;
      const xs = Array.from(list.children).map(
        (child) => child.getBoundingClientRect().x,
      );
      return new Set(xs.map((x) => Math.round(x))).size;
    });
    expect(stops).toBe(4);
  });
});
