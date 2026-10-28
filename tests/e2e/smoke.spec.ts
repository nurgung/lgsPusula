import { expect, test } from "@playwright/test";

const pages = [
  "/",
  "/giris",
  "/onizleme",
  "/onizleme/bilesenler",
  "/onizleme/durumlar",
  "/onizleme/karakterler",
  "/onizleme/ana-sayfa",
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

test("preview pages show the sample-data warning", async ({ page }) => {
  await page.goto("/onizleme/bilesenler");
  await expect(page.getByRole("note", { name: "Önizleme uyarısı" })).toContainText(
    "Gerçek öğrenci verisi göstermez",
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
