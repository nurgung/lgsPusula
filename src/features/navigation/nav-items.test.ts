import { describe, expect, it } from "vitest";
import { getNavItems, MAX_NAV_ITEMS } from "./nav-items";

const hrefs = (roles: Parameters<typeof getNavItems>[0]) =>
  getNavItems(roles).map((item) => item.href);

describe("getNavItems", () => {
  it("gives a student only student pages and settings", () => {
    expect(hrefs(["student"])).toEqual([
      "/ogrenci",
      "/ogrenci/calisma",
      "/ogrenci/denemeler",
      "/ayarlar",
    ]);
  });

  it("does not show the admin page to a parent without the admin role", () => {
    expect(hrefs(["parent"])).toEqual(["/veli", "/veli/raporlar", "/ayarlar"]);
  });

  it("merges parent and admin menus for the owner account (0.13)", () => {
    expect(hrefs(["admin", "parent"])).toEqual([
      "/veli",
      "/veli/raporlar",
      "/yonetici",
      "/ayarlar",
    ]);
  });

  it("never shows student pages to a parent or admin", () => {
    expect(hrefs(["parent", "admin"]).some((href) => href.startsWith("/ogrenci"))).toBe(
      false,
    );
  });

  it("returns no items without a role", () => {
    expect(getNavItems([])).toEqual([]);
  });

  it("removes duplicates when a role is listed twice", () => {
    expect(hrefs(["student", "student"])).toEqual(hrefs(["student"]));
  });

  it(`fits every allowed account type into ${MAX_NAV_ITEMS} items`, () => {
    for (const roles of [["student"], ["parent"], ["parent", "admin"]] as const) {
      expect(getNavItems(roles).length).toBeLessThanOrEqual(MAX_NAV_ITEMS);
    }
  });

  it("fails loudly instead of hiding pages when a menu would not fit", () => {
    expect(() => getNavItems(["student", "parent", "admin"])).toThrow(/at most/);
  });
});
