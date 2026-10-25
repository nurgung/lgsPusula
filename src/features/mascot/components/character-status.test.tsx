import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { addCalendarDays } from "@/features/study/calendar";
import { evaluateGrowth, growthNoticeContent, type StudyContribution } from "../growth";
import { MASCOT_MESSAGES, stageEarnedNotice, supportiveCopyIssues } from "../messages";
import { SPECIES } from "../species";
import { CharacterStatus } from "./character-status";
import { GrowthNotices } from "./growth-notices";

vi.mock("../actions", () => ({
  dismissReminderAction: vi.fn(),
}));

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

  it("shows the pose, sentence, and notice for each health state", () => {
    const today = "2026-10-24";
    const cases: {
      days: string[];
      health: "healthy" | "tired" | "sick" | "recovering";
    }[] = [
      { health: "healthy", days: [today] },
      { health: "tired", days: [addCalendarDays(today, -2)] },
      { health: "sick", days: [addCalendarDays(today, -4)] },
      { health: "recovering", days: [addCalendarDays(today, -4), today] },
    ];
    const labels = {
      healthy: MASCOT_MESSAGES.healthHealthy,
      tired: MASCOT_MESSAGES.healthTired,
      sick: MASCOT_MESSAGES.healthSick,
      recovering: MASCOT_MESSAGES.healthRecovering,
    } as const;
    const details = {
      healthy: MASCOT_MESSAGES.healthHealthyDetail,
      tired: MASCOT_MESSAGES.healthTiredDetail,
      sick: MASCOT_MESSAGES.healthSickDetail,
      recovering: MASCOT_MESSAGES.healthRecoveringDetail,
    } as const;

    for (const item of cases) {
      const growth = evaluateGrowth({
        today,
        logs: item.days.map((studiedOn) => ({ studiedOn, questionCount: 2 })),
        rewards: [],
      });
      expect(growth.health).toBe(item.health);
      const { unmount } = render(
        <>
          <GrowthNotices
            notices={growth.notices.map((notice) => ({
              id: `${notice.kind}-${notice.noticeDate}`,
              ...growthNoticeContent(notice.kind, growth.stageName),
            }))}
          />
          <CharacterStatus species="cat" growth={growth} />
        </>,
      );
      expect(screen.getByText(new RegExp(`Sağlık: ${labels[item.health]}`))).toBeTruthy();
      expect(document.body.textContent).toContain(details[item.health]);
      expect(
        document.querySelector(
          `[data-species-figure="cat"][data-health="${item.health}"][data-figure-size="regular"]`,
        ),
      ).toBeTruthy();
      for (const notice of growth.notices) {
        const copy = growthNoticeContent(notice.kind, growth.stageName);
        expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
        expect(screen.getByText(copy.body)).toBeTruthy();
        expect(supportiveCopyIssues(copy.body)).toEqual([]);
      }
      if (growth.notices.length === 0) {
        expect(screen.queryByText(MASCOT_MESSAGES.noticeInApp)).toBeNull();
      } else {
        expect(screen.getAllByText(MASCOT_MESSAGES.noticeInApp)).toHaveLength(
          growth.notices.length,
        );
      }
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
