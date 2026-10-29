import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PeriodSummary } from "@/features/study/summary";
import { LatestExam, WeekSummary } from "./week-and-exam";

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

describe("WeekSummary", () => {
  it("shows labeled week totals and the study records link", () => {
    render(<WeekSummary summary={summary} />);
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
    expect(
      screen.getByRole("link", { name: "Çalışma kayıtları" }).getAttribute("href"),
    ).toBe("/ogrenci/calisma");
  });

  it("shows an empty week without invented numbers", () => {
    render(
      <WeekSummary
        summary={{
          ...summary,
          questionCount: 0,
          correctCount: 0,
          wrongCount: 0,
          blankCount: 0,
          durationMinutes: 0,
          bySubject: [],
        }}
      />,
    );
    expect(screen.getByText("Bu hafta henüz çalışma kaydı yok.")).toBeTruthy();
    expect(screen.queryByText("Toplam soru")).toBeNull();
    expect(screen.queryByText("Doğru cevap")).toBeNull();
    expect(screen.queryByText("Süre")).toBeNull();
  });
});

describe("LatestExam", () => {
  it("renders nothing without an exam, so the empty state is told only once", () => {
    const { container } = render(<LatestExam exam={null} />);
    expect(container.textContent).toBe("");
  });

  it("keeps name, date, type and the detail link without repeating score or net", () => {
    render(
      <LatestExam
        exam={{
          id: "exam-1",
          title: "Ekim denemesi",
          takenOn: "2026-10-20",
          examType: "lgs_full",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Son deneme" })).toBeTruthy();
    expect(screen.getByText("Ekim denemesi")).toBeTruthy();
    expect(screen.getByText("20 Ekim 2026")).toBeTruthy();
    expect(screen.getByText(/Tam LGS denemesi/)).toBeTruthy();
    expect(screen.queryByText("Net")).toBeNull();
    expect(screen.queryByText("soru neti")).toBeNull();
    expect(screen.getByRole("link", { name: "Denemeye bak" }).getAttribute("href")).toBe(
      "/ogrenci/denemeler/exam-1",
    );
  });
});
