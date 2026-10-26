import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CelebrationView } from "../celebration";
import { CelebrationDialog } from "./celebration-dialog";
import { DailyGoals } from "./daily-goals";
import { StagePath } from "./stage-path";
import { SubjectTiles } from "./subject-tiles";
import { addCalendarDays } from "@/features/study/calendar";
import { evaluateGrowth, type StudyContribution } from "@/features/mascot/growth";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

const view: CelebrationView = {
  heading: "Hedefe ulaştın.",
  detail: "Bugünkü soru hedefin tamam.",
  stageId: "settling",
  species: "cat",
  tasks: [
    { id: "log_today", title: "Bugün bir çalışma kaydı ekle.", done: true },
    { id: "meet_goal", title: "Bugünkü soru hedefine ulaş.", done: true },
  ],
};

describe("StagePath", () => {
  it("marks the current stop with the character and names every stop", () => {
    const logs: StudyContribution[] = Array.from({ length: 7 }, (_, index) => ({
      studiedOn: addCalendarDays("2026-10-24", index - 6),
      questionCount: 1,
    }));
    const growth = evaluateGrowth({
      today: "2026-10-24",
      logs,
      rewards: logs.map((log) => ({ points: 5, sourceDate: log.studiedOn })),
    });
    render(<StagePath stageId={growth.stageId} species="cat" growth={growth} detailed />);
    expect(screen.getByRole("heading", { name: "Aşama yolun" })).toBeTruthy();
    for (const name of ["Yeni arkadaş", "Alışıyor", "Birlikte büyüyor", "Yol arkadaşı"]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByText("Geçildi")).toBeTruthy();
    expect(screen.getByText("Hayvan: Kedi. Buradasın.")).toBeTruthy();
    expect(
      document.querySelector(
        '[data-species-figure="cat"][data-health="healthy"][data-growth-stage="settling"]',
      ),
    ).toBeTruthy();
    expect(document.querySelector(".species-cat-head")).toBeTruthy();
    expect(document.querySelector('[data-figure-size="hero"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-species-figure="cat"]')).toHaveLength(1);
    expect(screen.getByText("Karakter puanı")).toBeTruthy();
    expect(screen.getByText("Çalışma serisi")).toBeTruthy();
    expect(screen.getByText("Toplam soru")).toBeTruthy();
    expect(screen.getByRole("progressbar").className).toContain("h-5");
    expect(document.querySelector("svg")).toBeNull();
    expect(screen.getAllByText("Sırada")).toHaveLength(2);
    const stageName = screen.getByText("Alışıyor");
    const pointsLabel = screen.getByText("Karakter puanı");
    expect(
      stageName.compareDocumentPosition(pointsLabel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("35")).toBeTruthy();
    expect(screen.getByText("7 gün")).toBeTruthy();
    expect(screen.queryByText("Toplam 35 karakter puanı. Aşama: Alışıyor.")).toBeNull();
    expect(screen.queryByText(/En uzun seri: 7 gün/)).toBeNull();
    expect(screen.getByText("14 günlük seriyi tamamlaman gerekiyor")).toBeTruthy();
    expect(screen.getByText("Buradasın")).toBeTruthy();
    expect(screen.queryByText(/Level|Explorer/)).toBeNull();
    expect(screen.getByRole("link", { name: "Karaktere bak" }).getAttribute("href")).toBe(
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
    render(<StagePath stageId={growth.stageId} species="cat" growth={growth} detailed />);
    expect(growth.stageId).toBe("companion");
    expect(
      screen.getByText("Bu en yüksek aşama. Kazandığın aşama sende kalır."),
    ).toBeTruthy();
    expect(screen.queryByText(/Kalan/)).toBeNull();
  });
});

describe("DailyGoals", () => {
  it("shows a check and the word Tamam together", () => {
    render(
      <DailyGoals
        facts={{
          todayLogCount: 1,
          todayQuestionCount: 10,
          dailyGoalTarget: 10,
          reviewExamId: null,
        }}
      />,
    );
    const done = screen.getByText("Bugünkü soru hedefine ulaş.").closest("li");
    expect(done?.textContent).toContain("✓");
    expect(done?.textContent).toContain("Tamam");
  });
});

describe("SubjectTiles", () => {
  it("links each real subject into the study form", () => {
    render(<SubjectTiles subjects={[{ id: "ders-1", name: "Matematik" }]} />);
    const link = screen.getByRole("link", { name: "Matematik" });
    expect(link.getAttribute("href")).toBe("/ogrenci/calisma/yeni?ders=ders-1");
    expect(screen.queryByText(/Adventure/)).toBeNull();
  });

  it("explains an empty catalog", () => {
    render(<SubjectTiles subjects={[]} />);
    expect(screen.getByText("Ders listesi henüz hazır değil.")).toBeTruthy();
  });

  it("shows an empty week without inventing a score", () => {
    render(
      <SubjectTiles
        weekLabel="19 Ekim 2026 – 23 Ekim 2026"
        subjects={[{ id: "ders-1", name: "Matematik", weekQuestions: 0, goals: [] }]}
      />,
    );
    expect(screen.getByText("Bu hafta henüz ders kaydı yok.")).toBeTruthy();
    expect(screen.queryByText(/%|başarı|sıralama/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Matematik" }).getAttribute("href")).toBe(
      "/ogrenci/calisma/yeni?ders=ders-1",
    );
  });

  it("shows this week's questions and a real subject goal", () => {
    render(
      <SubjectTiles
        weekLabel="19 Ekim 2026 – 23 Ekim 2026"
        subjects={[
          {
            id: "ders-1",
            name: "Matematik",
            weekQuestions: 8,
            goals: [
              {
                id: "week-1",
                periodLabel: "Haftalık hedef",
                doneQuestions: 8,
                targetQuestions: 20,
                met: false,
              },
            ],
          },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: /Matematik/ });
    expect(link.getAttribute("href")).toBe("/ogrenci/calisma/yeni?ders=ders-1");
    expect(link.textContent).toContain("Bu hafta 8 soru");
    expect(link.textContent).toContain("8 / 20 soru");
    expect(link.textContent).toContain("Kalan 12 soru.");
    expect(link.textContent).not.toMatch(/Hedefe ulaştın/);
    expect(screen.getByRole("progressbar", { name: "Haftalık hedef" }).getAttribute("aria-valuenow")).toBe(
      "8",
    );
    expect(screen.queryByText(/%|sıralama/i)).toBeNull();
  });

  it("shows the weekly count without a bar when the subject has no goal", () => {
    render(
      <SubjectTiles
        subjects={[
          {
            id: "ders-1",
            name: "T.C. İnkılap Tarihi ve Atatürkçülük",
            weekQuestions: 4,
            goals: [],
          },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: /İnkılap Tarihi/ });
    expect(link.getAttribute("href")).toBe("/ogrenci/calisma/yeni?ders=ders-1");
    expect(link.textContent).toContain("T.C. İnkılap Tarihi ve Atatürkçülük");
    expect(link.textContent).toContain("Bu hafta 4 soru");
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});

describe("CelebrationDialog", () => {
  it("shows the path, the medal, the real name, and Tamam", () => {
    const onClose = vi.fn();
    render(<CelebrationDialog open view={view} onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Hedefe ulaştın." });
    expect(dialog.textContent).toContain("Bugünkü soru hedefin tamam.");
    expect(dialog.textContent).toContain("Madalya");
    expect(dialog.textContent).toContain("Alışıyor");
    expect(dialog.querySelector('[data-figure-size="compact"]')).toBeTruthy();
    expect(dialog.querySelector('[data-figure-size="hero"]')).toBeNull();
    expect(dialog.textContent).toContain("✓");
    expect(dialog.textContent).toContain("Tamam");
    expect(screen.getByRole("button", { name: "Tamam" })).toBe(document.activeElement);
    fireEvent.click(screen.getByRole("button", { name: "Tamam" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<CelebrationDialog open view={view} onClose={onClose} />);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
