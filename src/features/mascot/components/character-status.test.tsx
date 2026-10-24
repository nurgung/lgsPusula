import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { addCalendarDays } from "@/features/study/calendar";
import { evaluateGrowth, growthNoticeContent, type StudyContribution } from "../growth";
import { SPECIES } from "../species";
import { stageEarnedNotice, supportiveCopyIssues } from "../messages";
import { CharacterStatus } from "./character-status";

function span(end: string, count: number, questions: number): StudyContribution[] {
  return Array.from({ length: count }, (_, index) => ({
    studiedOn: addCalendarDays(end, index - (count - 1)),
    questionCount: questions,
  }));
}

describe("CharacterStatus", () => {
  it("shows the visible stage, health, streak, and the missing condition", () => {
    const growth = evaluateGrowth({
      today: "2026-10-24",
      logs: span("2026-10-24", 7, 1),
      rewards: span("2026-10-24", 7, 1).map((log) => ({
        points: 5,
        sourceDate: log.studiedOn,
      })),
    });
    render(<CharacterStatus species="daisy" growth={growth} showLinks />);

    expect(screen.getByText("Bitki: Papatya. Buradasın.")).toBeTruthy();
    expect(screen.getByText("Toplam 35 karakter puanı. Aşama: Alışıyor.")).toBeTruthy();
    expect(screen.getByText(/Sağlık: İyi görünüyor/)).toBeTruthy();
    expect(screen.getByText(/Çalışma serisi: 7 gün\. En uzun seri: 7 gün/)).toBeTruthy();
    expect(screen.getByText("14 günlük seriyi tamamlaman gerekiyor")).toBeTruthy();
    expect(screen.getByText("7 / 14 gün")).toBeTruthy();
    expect(screen.getByText("300 sorudan 7 tanesini tamamladın")).toBeTruthy();
    expect(screen.queryByText(/growth-v1|mascot-v1/)).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    const figure = document.querySelector(
      '[data-species-figure="daisy"][data-health="healthy"][data-growth-stage="settling"]',
    );
    expect(figure).toBeTruthy();
    expect(screen.getByRole("link", { name: "Karaktere bak" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
  });

  it("uses a different pose attribute for every health and species", () => {
    const css = readFileSync("src/features/mascot/components/species-figure.css", "utf8");
    for (const health of ["healthy", "tired", "sick", "recovering"]) {
      expect(css).toContain(`data-health="${health}"`);
    }
    expect(css).toContain('[data-species-figure="daisy"]');
    expect(css).toContain('[data-species-figure="sapling"]');
    expect(css).not.toMatch(/url\(|\.png|\.webp|\.svg/);
    for (const species of SPECIES) {
      const growth = evaluateGrowth({
        today: "2026-10-24",
        logs: [{ studiedOn: "2026-10-20", questionCount: 2 }],
        rewards: [{ points: 5, sourceDate: "2026-10-20" }],
      });
      const { unmount } = render(
        <CharacterStatus species={species.code} growth={growth} />,
      );
      expect(growth.health).toBe("sick");
      expect(
        document.querySelector(
          `[data-species-figure="${species.code}"][data-health="sick"][data-growth-stage="new"]`,
        ),
      ).toBeTruthy();
      unmount();
    }
  });
});

describe("growth notice copy", () => {
  it("names the earned stage and stays supportive", () => {
    for (const name of ["Alışıyor", "Birlikte büyüyor", "Yol arkadaşı"]) {
      const text = stageEarnedNotice(name);
      expect(supportiveCopyIssues(text)).toEqual([]);
      expect(text).toContain(name);
    }
    const stage = growthNoticeContent("stage_earned", "Alışıyor");
    expect(stage.title).toBe("Yeni aşama");
    expect(stage.body).toContain("Alışıyor aşamasına geldin");
    expect(growthNoticeContent("mascot_sick", "Yeni arkadaş").body).not.toMatch(
      /başarısız|tembel|ceza/,
    );
  });
});
