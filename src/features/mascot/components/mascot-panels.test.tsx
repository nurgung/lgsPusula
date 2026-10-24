import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskList } from "./mascot-panels";

describe("TaskList", () => {
  it("separates an open goal from a finished log", () => {
    render(
      <TaskList
        facts={{
          todayLogCount: 1,
          todayQuestionCount: 4,
          dailyGoalTarget: 10,
          reviewExamId: null,
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Açık" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tamamlanan" })).toBeTruthy();
    expect(screen.getAllByText("Tamam").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Açık").length).toBeGreaterThan(1);
    expect(screen.getByRole("link", { name: "Kayıt ekle" }).getAttribute("href")).toBe(
      "/ogrenci/calisma/yeni",
    );
  });

  it("shows a finished state when every task is done", () => {
    render(
      <TaskList
        facts={{
          todayLogCount: 1,
          todayQuestionCount: 10,
          dailyGoalTarget: 10,
          reviewExamId: null,
        }}
      />,
    );
    expect(screen.getByText("Bugünkü görevlerin tamam.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Kayıt ekle" })).toBeNull();
    expect(screen.getAllByText("Tamam").length).toBeGreaterThan(0);
  });
});
