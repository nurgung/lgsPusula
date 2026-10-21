import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecommendationCard } from "./recommendation-card";
import { buildCoachingReport } from "../rules";

describe("RecommendationCard", () => {
  it("shows the reason for an invitation and a link to set a goal", () => {
    render(
      <RecommendationCard
        report={buildCoachingReport({
          today: "2026-10-20",
          logs: [],
          goals: [],
          exams: [],
          mistakes: [],
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Bugünkü öneri" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Neden?" })).toBeTruthy();
    expect(screen.getByText(/küçük bir soru hedefi/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Hedef belirle" }).getAttribute("href")).toBe(
      "/ogrenci/hedefler",
    );
  });

  it("hides the student action when a parent is reading", () => {
    render(
      <RecommendationCard
        audience="parent"
        readOnlyNote="Kayıtları yalnızca öğrenci değiştirebilir."
        report={buildCoachingReport({
          today: "2026-10-20",
          logs: [],
          goals: [],
          exams: [],
          mistakes: [],
        })}
      />,
    );
    expect(screen.queryByRole("link", { name: "Hedef belirle" })).toBeNull();
    expect(screen.getByText("Kayıtları yalnızca öğrenci değiştirebilir.")).toBeTruthy();
  });

  it("shows no action link when the rules refuse to infer", () => {
    render(
      <RecommendationCard
        report={buildCoachingReport({
          today: "2026-10-20",
          logs: [
            {
              id: "log-1",
              studiedOn: "2026-10-20",
              subjectId: "sub-mat",
              subjectName: "Matematik",
              topicId: null,
              topicName: null,
              outcomeId: null,
              outcomeCode: null,
              questionCount: 10,
              correctCount: 8,
              wrongCount: 2,
              blankCount: 0,
              durationMinutes: 15,
            },
          ],
          goals: [
            {
              id: "goal-1",
              period: "day",
              subjectId: null,
              subjectName: null,
              targetQuestions: 10,
            },
          ],
          exams: [],
          mistakes: [],
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Neden?" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Hedef belirle" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Kayıt yaz" })).toBeNull();
  });
});
