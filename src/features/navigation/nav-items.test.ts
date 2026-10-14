import { describe, expect, it } from "vitest";
import { getNavItems, MAX_NAV_ITEMS } from "./nav-items";

const hrefs = (roles: Parameters<typeof getNavItems>[0]) =>
  getNavItems(roles).map((item) => item.href);

describe("getNavItems", () => {
  it("gives a student the home page, topic list and account page", () => {
    expect(hrefs(["student"])).toEqual(["/ogrenci", "/ogrenci/konular", "/hesap"]);
  });

  it("does not show the admin page to a parent without the admin role", () => {
    expect(hrefs(["parent"])).toEqual(["/veli", "/hesap"]);
  });

  it("merges parent and admin menus for the owner account (0.13)", () => {
    expect(hrefs(["admin", "parent"])).toEqual(["/veli", "/yonetici", "/hesap"]);
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

  it("still refuses a menu that would not fit on a 320 px screen", () => {
    expect(MAX_NAV_ITEMS).toBe(5);
    expect(getNavItems(["student", "parent", "admin"]).length).toBeLessThanOrEqual(
      MAX_NAV_ITEMS,
    );
  });
});
