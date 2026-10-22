import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OFFLINE_CACHE_NAME,
  OFFLINE_PATH,
  SHELL_PATHS,
  isSensitivePath,
  mayReadShellCache,
  navigationUsesNetworkOnly,
} from "./offline-policy";

describe("offline policy", () => {
  it("serves a failed navigation from the static page, not from a saved copy", () => {
    expect(navigationUsesNetworkOnly("navigate")).toBe(true);
    expect(navigationUsesNetworkOnly("cors")).toBe(false);
  });

  it("caches only the offline shell, never a student or parent route", () => {
    expect(mayReadShellCache(OFFLINE_PATH)).toBe(true);
    expect(mayReadShellCache("/icons/icon-192.png")).toBe(true);
    for (const path of ["/ogrenci", "/ogrenci/calisma", "/veli", "/giris", "/hesap"]) {
      expect(mayReadShellCache(path)).toBe(false);
      expect(isSensitivePath(path)).toBe(true);
    }
  });

  it("keeps the service worker on the same rule", () => {
    const source = readFileSync("public/sw.js", "utf8");
    expect(source).toContain(OFFLINE_CACHE_NAME);
    expect(source).toContain(OFFLINE_PATH);
    for (const path of SHELL_PATHS) expect(source).toContain(path);
    expect(source).toContain('request.mode === "navigate"');
    expect(source).not.toContain("cache.put");
    expect(source).not.toContain("/ogrenci");
    expect(source).not.toContain("/veli");
  });
});
