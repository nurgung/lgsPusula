import { describe, expect, it } from "vitest";
import { getActiveHref } from "./navigation";

const items = [
  { href: "/ogrenci", label: "Ana sayfa" },
  { href: "/ogrenci/calisma", label: "Çalışma" },
  { href: "/ogrenci/denemeler", label: "Denemeler" },
];

describe("getActiveHref", () => {
  it("matches the exact page", () => {
    expect(getActiveHref("/ogrenci", items)).toBe("/ogrenci");
  });

  it("prefers the most specific parent segment", () => {
    expect(getActiveHref("/ogrenci/calisma", items)).toBe("/ogrenci/calisma");
    expect(getActiveHref("/ogrenci/denemeler/abc", items)).toBe("/ogrenci/denemeler");
  });

  it("does not match partial segment names", () => {
    expect(getActiveHref("/ogrenciler", items)).toBeUndefined();
  });

  it("returns undefined for unrelated pages", () => {
    expect(getActiveHref("/", items)).toBeUndefined();
  });
});
