import { expect, test } from "@playwright/test";

const pages = [
  "/",
  "/giris",
  "/onizleme",
  "/onizleme/ogrenci",
  "/onizleme/veli",
  "/onizleme/yonetici",
  "/onizleme/durumlar",
];

for (const path of pages) {
  test(`${path} renders one h1 without horizontal overflow`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const path of ["/onizleme/ogrenci", "/onizleme/veli", "/onizleme/yonetici"]) {
  test(`${path} tables keep all columns visible without scrolling`, async ({ page }) => {
    await page.goto(path);
    const regions = page.locator("[role=region] table").locator("..");
    const count = await regions.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const overflow = await regions
        .nth(i)
        .evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });
}

test("preview pages show the sample-data warning", async ({ page }) => {
  await page.goto("/onizleme/ogrenci");
  await expect(page.getByRole("note", { name: "Önizleme uyarısı" })).toContainText(
    "örnek veri",
  );
});

test("skip link moves focus target to main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "İçeriğe geç" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#ana-icerik$/);
});

test("security headers are sent", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});
