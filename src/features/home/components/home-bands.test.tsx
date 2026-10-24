import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CelebrationView } from "../celebration";
import { CelebrationDialog } from "./celebration-dialog";
import { DailyGoals } from "./daily-goals";
import { StagePath } from "./stage-path";
import { SubjectTiles } from "./subject-tiles";

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
    render(<StagePath stageId="settling" species="cat" points={12} detailed />);
    expect(screen.getByRole("heading", { name: "Aşama yolun" })).toBeTruthy();
    for (const name of ["Yeni arkadaş", "Alışıyor", "Birlikte büyüyor", "Yol arkadaşı"]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByText("Geçildi")).toBeTruthy();
    expect(screen.getByText("Kedi. Buradasın.")).toBeTruthy();
    expect(screen.getAllByText("Sırada")).toHaveLength(2);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.queryByText(/Level|Explorer/)).toBeNull();
    expect(screen.getByRole("link", { name: "Karaktere bak" }).getAttribute("href")).toBe(
      "/ogrenci/karakter",
    );
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
});

describe("CelebrationDialog", () => {
  it("shows the path, the medal, the real name, and Tamam", () => {
    const onClose = vi.fn();
    render(<CelebrationDialog open view={view} onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Hedefe ulaştın." });
    expect(dialog.textContent).toContain("Bugünkü soru hedefin tamam.");
    expect(dialog.textContent).toContain("Madalya");
    expect(dialog.textContent).toContain("Alışıyor");
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
