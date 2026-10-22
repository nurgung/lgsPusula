import { expect, test } from "@playwright/test";
import {
  createTestAccount,
  isAuthConfigured,
  signIn,
  useFreshClientIp,
} from "./support/auth.ts";

test("the offline page says records are not kept on the device", async ({ page }) => {
  await page.goto("/cevrimdisi");
  await expect(page.getByRole("heading", { name: "İnternet yok" })).toBeVisible();
  await expect(page.getByText("Kayıtların bu telefonda saklanmaz.")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Giriş sayfasına dön" })).toBeFocused();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("HTML responses carry a per-request nonce policy", async ({ page }) => {
  const response = await page.goto("/giris");
  const csp = response?.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("script-src 'self' 'nonce-");
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("worker-src 'self'");
  expect(csp).not.toContain("upgrade-insecure-requests");
  const html = (await response?.text()) ?? "";
  const scriptNonce = html.match(/nonce="([^"]+)"/)?.[1];
  expect(scriptNonce).toBeTruthy();
  expect(csp).toContain(`'nonce-${scriptNonce}'`);
});

test("a signed-in student sees what is stored and what a parent can see", async ({
  page,
}) => {
  test.skip(
    !isAuthConfigured(),
    "Supabase is not configured (see README: yerel Supabase).",
  );
  await useFreshClientIp(page);
  const student = await createTestAccount({ displayName: "Bilgi Öğrencisi" });
  await signIn(page, student.username, student.password);
  const notice = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Bu uygulamada neler durur?" }),
  });
  await expect(notice.getByText("kimlik numaran")).toBeVisible();
  await expect(notice.getByText("onaylamadan")).toBeVisible();
  await expect(notice.getByText("telefonda saklanmaz")).toBeVisible();

  await page.goto("/hesap");
  await expect(page.getByRole("heading", { name: "Telefona ekle" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Safari" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
