import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";
import { GoalBoard } from "./goal-board";

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

describe("GoalBoard", () => {
  it("shows an empty state when no goal is saved", () => {
    render(<GoalBoard goals={[]} logs={[]} today={today} />);
    expect(screen.getByRole("heading", { name: "Hedeflerin" })).toBeTruthy();
    expect(screen.getByText("Henüz hedefin yok.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Günlük hedef" })).toBeNull();
  });

  it("keeps daily and weekly progress in one section and names a finished goal", () => {
    render(<GoalBoard goals={goals} logs={[log]} today={today} />);
    expect(screen.getAllByRole("heading", { name: "Hedeflerin" })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Günlük hedef" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Haftalık hedef" })).toBeTruthy();
    expect(
      screen.getByText(
        (_content, node) => node?.textContent?.replace(/\s+/g, " ").trim() === "10 / 10 soru",
      ).querySelector(".text-4xl")?.textContent,
    ).toBe("10");
    expect(screen.getByText("Hedefe ulaştın.")).toBeTruthy();
    expect(screen.getByText("10 / 20 soru")).toBeTruthy();
    expect(screen.getByText("Kalan 10 soru.")).toBeTruthy();
    expect(screen.getAllByText("Tüm dersler")).toHaveLength(2);
  });
});
