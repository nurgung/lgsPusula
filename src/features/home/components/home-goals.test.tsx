import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";
import { HomeGoals } from "./home-goals";

const today = "2026-10-23";

const log: StudyLogView = {
  id: "log-1",
  studiedOn: today,
  subjectId: "sub-mat",
  subjectName: "Matematik",
  topicId: null,
  topicName: null,
  outcomeId: null,
  outcomeCode: null,
  questionCount: 10,
  correctCount: 6,
  wrongCount: 3,
  blankCount: 1,
  durationMinutes: 25,
};

const goals: StudyGoalView[] = [
  {
    id: "day-1",
    period: "day",
    subjectId: null,
    subjectName: null,
    targetQuestions: 10,
  },
  {
    id: "week-1",
    period: "week",
    subjectId: null,
    subjectName: null,
    targetQuestions: 20,
  },
];

describe("HomeGoals", () => {
  it("puts the open task above the finished one and separates day from week", () => {
    render(
      <HomeGoals
        facts={{
          todayLogCount: 0,
          todayQuestionCount: 10,
          dailyGoalTarget: 10,
          reviewExamId: null,
        }}
        goals={goals}
        logs={[log]}
        today={today}
      />,
    );
    expect(screen.getAllByRole("heading", { name: "Bugünün hedefleri" })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Hedeflerin" })).toBeNull();
    const tasks = within(screen.getByRole("list", { name: "Görevler" })).getAllByRole(
      "listitem",
    );
    expect(tasks[0]?.textContent).toContain("Açık");
    expect(tasks[0]?.textContent).toContain("çalışma kaydı");
    expect(tasks[0]?.getAttribute("data-task-emphasis")).toBe("primary");
    expect(tasks[0]?.querySelector("a")?.getAttribute("href")).toBe("/ogrenci/calisma/yeni");
    expect(tasks[1]?.textContent).toContain("Tamam");
    expect(tasks[1]?.textContent).toContain("✓");
    expect(tasks[1]?.textContent).not.toContain("Açık");
    expect(tasks[1]?.getAttribute("data-task-emphasis")).toBe("done");
    expect(tasks[1]?.querySelector("a")).toBeNull();
    expect(screen.getByRole("heading", { name: "Günlük hedef" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Haftalık hedef" })).toBeTruthy();
    expect(screen.getByText("Hedefe ulaştın.")).toBeTruthy();
    expect(screen.getByText("Kalan 10 soru.")).toBeTruthy();
    expect(
      screen.getByText(
        (_content, node) => node?.textContent?.replace(/\s+/g, " ").trim() === "10 / 10 soru",
      ).querySelector(".text-4xl")?.textContent,
    ).toBe("10");
    const bars = screen.getAllByRole("progressbar", { name: "Tüm dersler" });
    expect(bars[0]?.getAttribute("aria-valuemax")).toBe("10");
    expect(bars[0]?.getAttribute("aria-valuenow")).toBe("10");
    expect(bars[1]?.getAttribute("aria-valuemax")).toBe("20");
    expect(bars[1]?.getAttribute("aria-valuenow")).toBe("10");
    expect(screen.getByText("10 / 20 soru").querySelector(".text-4xl")).toBeNull();
  });

  it("keeps a second open task quieter and does not invent a finished goal", () => {
    render(
      <HomeGoals
        facts={{
          todayLogCount: 0,
          todayQuestionCount: 3,
          dailyGoalTarget: 10,
          reviewExamId: "sinav-1",
        }}
        goals={goals}
        logs={[{ ...log, questionCount: 3, correctCount: 2, wrongCount: 1, blankCount: 0 }]}
        today={today}
      />,
    );
    const tasks = within(screen.getByRole("list", { name: "Görevler" })).getAllByRole(
      "listitem",
    );
    expect(tasks.map((task) => task.getAttribute("data-task-emphasis"))).toEqual([
      "primary",
      "secondary",
      "secondary",
    ]);
    expect(tasks[0]?.querySelector("a")?.getAttribute("href")).toBe("/ogrenci/calisma/yeni");
    expect(tasks[2]?.querySelector("a")?.getAttribute("href")).toBe(
      "/ogrenci/denemeler/sinav-1/kazanimlar",
    );
    expect(screen.getByText("Kalan 7 soru.")).toBeTruthy();
    expect(screen.queryByText("Hedefe ulaştın.")).toBeNull();
    const bars = screen.getAllByRole("progressbar", { name: "Tüm dersler" });
    expect(bars[0]?.getAttribute("aria-valuemax")).toBe("10");
    expect(bars[0]?.getAttribute("aria-valuenow")).toBe("3");
    expect(bars[0]?.firstElementChild?.className).toContain("w-[30%]");
  });
});
