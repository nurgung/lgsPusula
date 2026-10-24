import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { evaluateGrowth } from "@/features/mascot/growth";
import { CharacterHero } from "./character-hero";

describe("CharacterHero", () => {
  it("shows the species, visible stage, and points without the rule id", () => {
    const growth = evaluateGrowth({
      today: "2026-10-24",
      logs: [{ studiedOn: "2026-10-24", questionCount: 4 }],
      rewards: [{ points: 5, sourceDate: "2026-10-24" }],
    });
    render(<CharacterHero species="cat" growth={growth} />);
    expect(screen.getByRole("heading", { name: "Kedi" })).toBeTruthy();
    expect(screen.getByText("Hayvan: Kedi. Buradasın.")).toBeTruthy();
    expect(
      screen.getByText("Toplam 5 karakter puanı. Aşama: Yeni arkadaş."),
    ).toBeTruthy();
    expect(screen.getByText("7 günlük seriyi tamamlaman gerekiyor")).toBeTruthy();
    expect(screen.getByText(/Bir gün ara vermek puanı düşürmez/)).toBeTruthy();
    expect(screen.queryByText(/mascot-v1|growth-v1/)).toBeNull();
    expect(screen.getByRole("link", { name: "Karaktere bak" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
  });

  it("asks for a character when none is chosen and still shows the points", () => {
    const growth = evaluateGrowth({ today: "2026-10-24", logs: [], rewards: [] });
    render(<CharacterHero species={null} growth={growth} />);
    expect(screen.getByRole("heading", { name: "Karakterin" })).toBeTruthy();
    expect(screen.getByText("Henüz bir karakter seçmedin.")).toBeTruthy();
    expect(
      screen.getByText("Toplam 0 karakter puanı. Aşama: Yeni arkadaş."),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Karakter seç" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
  });
});
