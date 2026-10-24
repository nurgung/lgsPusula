import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PeriodSummary } from "@/features/study/summary";
import { WeekAndExamSummary } from "./week-and-exam";

const summary: PeriodSummary = {
  from: "2026-10-19",
  to: "2026-10-23",
  questionCount: 10,
  correctCount: 6,
  wrongCount: 3,
  blankCount: 1,
  durationMinutes: 25,
  bySubject: [
    {
      subjectId: "sub-mat",
      subjectName: "Matematik",
      questionCount: 10,
      durationMinutes: 25,
    },
  ],
};

describe("WeekAndExamSummary", () => {
  it("shows subject totals and an empty exam note", () => {
    render(<WeekAndExamSummary summary={summary} exam={null} />);
    expect(screen.getByRole("heading", { name: "Bu hafta" })).toBeTruthy();
    expect(screen.getByText(/6 doğru, 3 yanlış, 1 boş/)).toBeTruthy();
    expect(screen.getByText("Derslere göre soru sayısı ders kutularında.")).toBeTruthy();
    expect(screen.queryByText("10 soru · 25 dakika")).toBeNull();
    expect(screen.getByRole("heading", { name: "Son deneme" })).toBeTruthy();
    expect(screen.getByText("Henüz deneme kaydın yok.")).toBeTruthy();
    expect(screen.queryByText(/lgs-v1/)).toBeNull();
  });

  it("shows the latest exam net and a link to that exam", () => {
    render(
      <WeekAndExamSummary
        summary={{ ...summary, questionCount: 0, bySubject: [] }}
        exam={{
          id: "exam-1",
          title: "Ekim denemesi",
          takenOn: "2026-10-20",
          examType: "lgs_full",
          totalNet: 14,
        }}
      />,
    );
    expect(screen.getByText("Ekim denemesi")).toBeTruthy();
    expect(screen.getByText(/Toplam net 14,00/)).toBeTruthy();
    expect(screen.getByText(/Tam LGS denemesi/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Denemeye bak" }).getAttribute("href")).toBe(
      "/ogrenci/denemeler/exam-1",
    );
  });
});
