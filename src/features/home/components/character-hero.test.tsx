import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { addCalendarDays } from "@/features/study/calendar";
import { evaluateGrowth, type StudyContribution } from "@/features/mascot/growth";
import { CharacterHero } from "./character-hero";

describe("CharacterHero", () => {
  it("leads with the figure, stage, stats, and connected path without rule ids", () => {
    const logs: StudyContribution[] = Array.from({ length: 7 }, (_, index) => ({
      studiedOn: addCalendarDays("2026-10-24", index - 6),
      questionCount: 1,
    }));
    const growth = evaluateGrowth({
      today: "2026-10-24",
      logs,
      rewards: logs.map((log) => ({ points: 5, sourceDate: log.studiedOn })),
    });
    render(<CharacterHero species="cat" growth={growth} />);

    expect(document.querySelector("[data-character-hero]")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Aşama yolun" })).toBeTruthy();
    for (const name of ["Yeni arkadaş", "Alışıyor", "Birlikte büyüyor", "Yol arkadaşı"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Şu anki aşama")).toBeTruthy();
    expect(
      screen.getByText("Alışıyor", { selector: "p.text-section" }),
    ).toBeTruthy();
    expect(screen.getByText("Hayvan: Kedi. Buradasın.")).toBeTruthy();
    expect(screen.getByText("Karakter puanı")).toBeTruthy();
    expect(screen.getByText("Çalışma serisi")).toBeTruthy();
    expect(screen.getByText("Toplam soru")).toBeTruthy();
    expect(screen.getByText("35")).toBeTruthy();
    expect(screen.getByText("7 gün")).toBeTruthy();
    expect(
      document.querySelector(
        '[data-species-figure="cat"][data-health="healthy"][data-growth-stage="settling"][data-figure-size="hero"]',
      ),
    ).toBeTruthy();
    expect(document.querySelectorAll('[data-species-figure="cat"]')).toHaveLength(1);
    expect(screen.getByRole("progressbar").className).toContain("h-5");
    expect(screen.getByText("14 günlük seriyi tamamlaman gerekiyor")).toBeTruthy();
    expect(screen.getByText("Buradasın")).toBeTruthy();
    expect(screen.getByText("Geçildi")).toBeTruthy();
    expect(screen.getAllByText("Sırada")).toHaveLength(2);
    expect(screen.queryByText(/mascot-v1|growth-v1|Level|Explorer/)).toBeNull();
    expect(screen.queryByText("Toplam 35 karakter puanı. Aşama: Alışıyor.")).toBeNull();
    expect(screen.getByRole("link", { name: "Karaktere bak" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );

    const stageLabel = screen.getByText("Şu anki aşama");
    const pointsLabel = screen.getByText("Karakter puanı");
    const pathHeading = screen.getByRole("heading", { name: "Aşama yolun" });
    expect(
      stageLabel.compareDocumentPosition(pointsLabel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      pointsLabel.compareDocumentPosition(pathHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("holds the page title, the health card and next-stage progress in the scene", () => {
    const growth = evaluateGrowth({
      today: "2026-10-24",
      logs: [{ studiedOn: "2026-10-24", questionCount: 5 }],
      rewards: [{ points: 5, sourceDate: "2026-10-24" }],
    });
    render(
      <CharacterHero
        species="turtle"
        growth={growth}
        greeting={{ name: "Deneme", dateLabel: "24 Ekim 2026" }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Merhaba, Deneme" })).toBeTruthy();
    expect(screen.getByText(/Bugün 24 Ekim 2026\./)).toBeTruthy();
    const side = screen.getByLabelText("Sağlık durumu ve sonraki aşama");
    expect(side.textContent).toContain("Sağlık: İyi görünüyor");
    expect(side.textContent).toContain("Sonraki aşama: Alışıyor");
    expect(within(side).getByRole("progressbar")).toBeTruthy();
    // The decorative scene is hidden from assistive technology.
    const scene = document.querySelector("[data-character-hero] svg[aria-hidden='true']");
    expect(scene).toBeTruthy();
  });

  it("has no page title of its own unless the page passes a greeting", () => {
    const growth = evaluateGrowth({ today: "2026-10-24", logs: [], rewards: [] });
    render(<CharacterHero species="cat" growth={growth} />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("asks for a character when none is chosen and still shows points", () => {
    const growth = evaluateGrowth({ today: "2026-10-24", logs: [], rewards: [] });
    render(<CharacterHero species={null} growth={growth} />);
    expect(screen.getByText("Henüz bir karakter seçmedin.")).toBeTruthy();
    expect(screen.getByText("Henüz seçilmedi")).toBeTruthy();
    const points = screen.getByText("Karakter puanı").closest("div")?.parentElement;
    expect(points?.textContent).toMatch(/Karakter puanı.*0/s);
    expect(screen.getByRole("link", { name: "Karakter seç" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
  });

  it("names the top stage without asking for another step", () => {
    const logs: StudyContribution[] = Array.from({ length: 30 }, (_, index) => ({
      studiedOn: addCalendarDays("2026-10-24", index - 29),
      questionCount: 25,
    }));
    const growth = evaluateGrowth({
      today: "2026-10-24",
      logs,
      rewards: logs.map((log) => ({ points: 5, sourceDate: log.studiedOn })),
    });
    render(<CharacterHero species="cat" growth={growth} />);
    expect(growth.stageId).toBe("companion");
    expect(
      screen.getByText("Bu en yüksek aşama. Kazandığın aşama sende kalır."),
    ).toBeTruthy();
    expect(screen.queryByText(/Kalan/)).toBeNull();
  });
});
