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
    expect(tasks[1]?.textContent).toContain("Tamam");
    expect(tasks[1]?.textContent).not.toContain("Açık");
    expect(screen.getByRole("heading", { name: "Günlük hedef" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Haftalık hedef" })).toBeTruthy();
    expect(screen.getByText("Hedefe ulaştın.")).toBeTruthy();
    expect(screen.getByText("Kalan 10 soru.")).toBeTruthy();
  });
});
