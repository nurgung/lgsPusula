import { expect, test } from "@playwright/test";

const DEMO = "/onizleme/bilesenler";

test.describe("form fields", () => {
  test("failed submit shows a linked error summary and marks fields invalid", async ({
    page,
  }) => {
    await page.goto(DEMO);
    await page.getByRole("button", { name: "Kaydet" }).click();

    const summary = page.getByRole("alert").filter({ hasText: "düzeltilmesi gereken" });
    await expect(summary).toBeVisible();
    const firstLink = summary.getByRole("link", { name: "Bir ders seç." });
    await expect(firstLink).toBeFocused();

    const subject = page.getByRole("combobox", { name: "Ders" });
    await expect(subject).toHaveAttribute("aria-invalid", "true");
    await expect(subject).toHaveAccessibleDescription("Hata: Bir ders seç.");

    await firstLink.press("Enter");
    await expect(page).toHaveURL(/#ornek-ders$/);
  });

  test("number fields open the numeric keyboard and describe the unit", async ({
    page,
  }) => {
    await page.goto(DEMO);
    const questions = page.getByRole("textbox", { name: "Çözülen soru" });
    await expect(questions).toHaveAttribute("inputmode", "numeric");
    await expect(questions).toHaveAccessibleDescription(
      "Bugün bu derste çözdüğün soru sayısı. soru",
    );
  });

  test("a valid submit announces success in the polite live region", async ({ page }) => {
    await page.goto(DEMO);
    await page.getByRole("combobox", { name: "Ders" }).selectOption("matematik");
    await page.getByRole("textbox", { name: "Çözülen soru" }).fill("20");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("status")).toContainText("Örnek kayıt eklendi.");
  });
});

test.describe("confirm dialog", () => {
  test("opens with focus on cancel, keeps Tab inside and closes with Escape", async ({
    page,
  }) => {
    await page.goto(DEMO);
    const opener = page.getByRole("button", { name: "Örnek kaydı sil" });
    await opener.click();

    const dialog = page.getByRole("alertdialog", {
      name: "Bu kaydı silmek istiyor musun?",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Vazgeç" })).toBeFocused();

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const inside = await dialog.evaluate((el) => el.contains(document.activeElement));
      expect(inside).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("the rest of the page cannot be clicked while it is open", async ({ page }) => {
    await page.goto(DEMO);
    await page.getByRole("button", { name: "Örnek kaydı sil" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    // The modal backdrop intercepts the pointer, so Playwright's click never lands.
    await expect(
      page.getByRole("button", { name: "Kaydet" }).click({ timeout: 1000 }),
    ).rejects.toThrow();
  });

  test("confirming closes the dialog and shows a success toast", async ({ page }) => {
    await page.goto(DEMO);
    await page.getByRole("button", { name: "Örnek kaydı sil" }).click();
    await page.getByRole("button", { name: "Sil", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(page.getByRole("status")).toContainText("Örnek kayıt silindi.");
  });
});

test.describe("toasts", () => {
  test("errors go to the alert region and close with a 44px button", async ({ page }) => {
    await page.goto(DEMO);
    await page.getByRole("button", { name: "Hata göster" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "Kayıt kaydedilemedi." });
    await expect(alert).toBeVisible();

    const close = page.getByRole("button", {
      name: "Bildirimi kapat: Kayıt kaydedilemedi.",
    });
    const box = await close.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    await close.click();
    await expect(alert).toHaveCount(0);
  });
});

test.describe("app layout", () => {
  test("shows exactly one main menu with 44px targets and marks the current page", async ({
    page,
  }, testInfo) => {
    await page.goto("/onizleme/durumlar");
    const nav = page.getByRole("navigation", { name: "Ana menü" });
    await expect(nav).toHaveCount(1);

    const current = nav.getByRole("link", { name: "Durumlar", exact: true });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(nav.locator("[aria-current=page]")).toHaveCount(1);

    for (const link of await nav.getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }

    const navBox = await nav.boundingBox();
    const viewportHeight = page.viewportSize()?.height ?? 0;
    expect(navBox).not.toBeNull();
    if (testInfo.project.name === "mobile-320") {
      // Bottom bar on small screens, within thumb reach.
      expect(Math.round((navBox?.y ?? 0) + (navBox?.height ?? 0))).toBe(viewportHeight);
    } else {
      expect(navBox?.y ?? Infinity).toBeLessThan(200);
    }
  });

  test("the bottom bar does not cover the last content on small screens", async ({
    page,
  }) => {
    await page.goto("/onizleme/durumlar");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const lastContent = page.locator("main > *").last();
    const nav = page.getByRole("navigation", { name: "Ana menü" });
    const contentBox = await lastContent.boundingBox();
    const navBox = await nav.boundingBox();
    expect(contentBox && navBox).toBeTruthy();
    if (contentBox && navBox && navBox.y > 200) {
      expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(navBox.y);
    }
  });
});
