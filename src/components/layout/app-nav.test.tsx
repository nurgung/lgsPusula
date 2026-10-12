import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/ogrenci/calisma" }));

const items = [
  { href: "/ogrenci", label: "Ana sayfa" },
  { href: "/ogrenci/calisma", label: "Çalışma" },
  { href: "/ayarlar", label: "Ayarlar" },
];

describe("AppNav", () => {
  for (const placement of ["top", "bottom"] as const) {
    it(`${placement}: is a named navigation landmark that marks only the current page`, () => {
      render(<AppNav items={items} placement={placement} />);
      const nav = screen.getByRole("navigation", { name: "Ana menü" });
      expect(nav.querySelectorAll("a")).toHaveLength(3);
      expect(
        screen.getByRole("link", { name: "Çalışma" }).getAttribute("aria-current"),
      ).toBe("page");
      expect(
        screen.getByRole("link", { name: "Ana sayfa" }).getAttribute("aria-current"),
      ).toBeNull();
    });
  }

  it("renders nothing when there are no items", () => {
    const { container } = render(<AppNav items={[]} placement="bottom" />);
    expect(container.innerHTML).toBe("");
  });
});
