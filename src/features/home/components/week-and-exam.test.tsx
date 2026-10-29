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
      correctCount: 6,
      wrongCount: 3,
      blankCount: 1,
      durationMinutes: 25,
    },
  ],
};

describe("WeekAndExamSummary", () => {
  it("shows labeled week totals and an empty exam note", () => {
    render(<WeekAndExamSummary summary={summary} exam={null} />);
    expect(screen.getByRole("heading", { name: "Bu hafta" })).toBeTruthy();
    expect(screen.getByText("19 Ekim 2026 – 23 Ekim 2026")).toBeTruthy();
    expect(screen.getByText("Toplam soru")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("Doğru cevap")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("Süre")).toBeTruthy();
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText("dakika")).toBeTruthy();
    expect(screen.queryByText("Yanlış")).toBeNull();
    expect(screen.queryByText("Boş")).toBeNull();
    expect(screen.queryByText("Derslere göre soru sayısı ders kutularında.")).toBeNull();
    expect(screen.getByRole("link", { name: "Çalışma kayıtları" }).getAttribute("href")).toBe(
      "/ogrenci/calisma",
    );
    expect(screen.getByRole("heading", { name: "Son deneme" })).toBeTruthy();
    expect(screen.getByText("Henüz deneme kaydın yok.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Deneme ekle" }).getAttribute("href")).toBe(
      "/ogrenci/denemeler/yeni",
    );
    expect(screen.queryByText(/lgs-v1/)).toBeNull();
  });

  it("shows an empty week without invented numbers and the latest exam net", () => {
    render(
      <WeekAndExamSummary
        summary={{
          ...summary,
          questionCount: 0,
          correctCount: 0,
          wrongCount: 0,
          blankCount: 0,
          durationMinutes: 0,
          bySubject: [],
        }}
        exam={{
          id: "exam-1",
          title: "Ekim denemesi",
          takenOn: "2026-10-20",
          examType: "lgs_full",
          totalNet: 14,
        }}
      />,
    );
    expect(screen.getByText("Bu hafta henüz çalışma kaydı yok.")).toBeTruthy();
    expect(screen.queryByText("Toplam soru")).toBeNull();
    expect(screen.queryByText("Doğru cevap")).toBeNull();
    expect(screen.queryByText("Süre")).toBeNull();
    expect(screen.getByText("Ekim denemesi")).toBeTruthy();
    expect(screen.getByText("20 Ekim 2026")).toBeTruthy();
    expect(screen.getByText(/Tam LGS denemesi/)).toBeTruthy();
    expect(screen.getByText("Net")).toBeTruthy();
    expect(screen.getByText("14,00")).toBeTruthy();
    expect(screen.getByText("soru neti")).toBeTruthy();
    expect(screen.queryByText("Yanlış")).toBeNull();
    expect(screen.queryByText("Boş")).toBeNull();
    expect(screen.getByRole("link", { name: "Denemeye bak" }).getAttribute("href")).toBe(
      "/ogrenci/denemeler/exam-1",
    );
  });
});
