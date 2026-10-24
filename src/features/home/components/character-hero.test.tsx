import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CharacterHero } from "./character-hero";

describe("CharacterHero", () => {
  it("shows the species, stage, and points without the rule id", () => {
    render(
      <CharacterHero
        species="cat"
        rewards={[
          {
            eventType: "study_log",
            points: 5,
            sourceDate: "2026-10-23",
            ruleVersion: "mascot-v1",
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Kedi" })).toBeTruthy();
    expect(screen.getByText(/Hayvan · Aşama 1 \/ 4: Yeni arkadaş/)).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("karakter puanı")).toBeTruthy();
    expect(screen.getByText("5 / 10 karakter puanı")).toBeTruthy();
    expect(screen.getByText(/Bir gün ara vermek puanı düşürmez/)).toBeTruthy();
    expect(screen.queryByText(/mascot-v1/)).toBeNull();
    expect(screen.queryByText(/Kural:/)).toBeNull();
    expect(screen.getByRole("link", { name: "Karaktere bak" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
  });

  it("asks for a character when none is chosen and still shows the points", () => {
    render(<CharacterHero species={null} rewards={[]} />);
    expect(screen.getByRole("heading", { name: "Karakterin" })).toBeTruthy();
    expect(screen.getByText("Henüz bir karakter seçmedin.")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Karakter seç" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
  });
});
