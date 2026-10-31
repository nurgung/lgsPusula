import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildWeeklyReportModel } from "../weekly-model";
import { WeeklyReportPanel } from "./weekly-report-panel";

describe("WeeklyReportPanel", () => {
  it("shows summary cards and empty states without inventing zeros in exam tables", () => {
    const model = buildWeeklyReportModel({
      studentName: "Şişli Öğrencisi",
      generatedAt: new Date("2026-10-21T07:55:00.000Z"),
      period: "current",
      today: "2026-10-21",
      logs: [
        {
          id: "1",
          studiedOn: "2026-10-20",
          subjectId: "sub-1",
          subjectName: "Türkçe",
          topicId: null,
          topicName: null,
          outcomeId: null,
          outcomeCode: null,
          questionCount: 4,
          correctCount: 2,
          wrongCount: 1,
          blankCount: 1,
          durationMinutes: 15,
        },
      ],
      goals: [],
      exams: [],
      suggestion: {
        message: "Bugün için küçük bir soru hedefi belirleyebilirsin.",
        reason: "Bu bir ders sonucu değil.",
        evidence: ["Kayıt yok."],
      },
    });

    render(<WeeklyReportPanel model={model} />);
    expect(screen.getByText("15 dakika")).toBeTruthy();
    expect(screen.getByText("4 soru")).toBeTruthy();
    expect(screen.getByText("1 gün")).toBeTruthy();
    expect(screen.getByText("0 deneme")).toBeTruthy();
    expect(screen.getByText("Kayıt yok")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Haftalık çalışma" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Haftalık deneme" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Kazanım eksikleri" })).toBeTruthy();
    expect(screen.getByText("Bu dönemde deneme yok.")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Toplam süre" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Gün" })).toBeTruthy();
    expect(screen.getAllByText("Türkçe").length).toBeGreaterThan(0);
  });
});
