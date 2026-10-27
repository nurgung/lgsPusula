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
    expect(screen.getByRole("heading", { name: "Bugünkü koçun" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Neden bu öneri?" })).toBeNull();
    expect(screen.getByText(/küçük bir soru hedefi/)).toBeTruthy();
    expect(screen.getByText(/günlük hedef satırı yok/)).toBeTruthy();
    expect(screen.queryByText(/Kural:/)).toBeNull();
    expect(screen.queryByText(/Europe\/Istanbul/)).toBeNull();
    expect(screen.queryByText(/coaching-v1/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Sade anlatım" })).toBeNull();
    expect(
      screen.getByText("Sade anlatım yok. Öneri, çalışma kayıtlarına göre hazır."),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/API|GROQ|AI_|öğrenci kimliği/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Hedef belirle" }).getAttribute("href")).toBe(
      "/ogrenci/hedefler",
    );
  });

  it("places extra home content after the action and before the reason", () => {
    render(
      <RecommendationCard
        afterAction={<p>Aşama özeti</p>}
        report={buildCoachingReport({
          today: "2026-10-20",
          logs: [],
          goals: [],
          exams: [],
          mistakes: [],
        })}
      />,
    );
    const lead = screen.getByText(/küçük bir soru hedefi/);
    const action = screen.getByRole("link", { name: "Hedef belirle" });
    const glance = screen.getByText("Aşama özeti");
    const reason = screen.getByText(/günlük hedef satırı yok/);
    expect(
      lead.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      action.compareDocumentPosition(glance) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      glance.compareDocumentPosition(reason) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(lead.textContent).toBe(
      "Bugün için küçük bir soru hedefi belirleyebilirsin. Hedef seçmezsen de çalışma kaydı yazabilirsin.",
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
    expect(screen.getByRole("heading", { name: "Neden bu öneri?" })).toBeTruthy();
    expect(screen.getByText("Bugünkü hedef tamam.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Hedef belirle" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Kayıt yaz" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tamamlandı" })).toBeNull();
  });

  it("lets the student mark the current outcome practice done", () => {
    render(
      <RecommendationCard
        report={buildCoachingReport({
          today: "2026-10-20",
          logs: [],
          goals: [],
          exams: [],
          mistakes: [
            {
              outcomeId: "11111111-1111-4111-8111-111111111111",
              outcomeCode: "F.8.1.1.1",
              outcomeDescription: "Mevsimlerin oluşumuna yönelik tahminlerde bulunur.",
              subjectId: "sub-fen",
              subjectName: "Fen Bilimleri",
              kind: "wrong",
              takenOn: "2026-10-18",
            },
            {
              outcomeId: "11111111-1111-4111-8111-111111111111",
              outcomeCode: "F.8.1.1.1",
              outcomeDescription: "Mevsimlerin oluşumuna yönelik tahminlerde bulunur.",
              subjectId: "sub-fen",
              subjectName: "Fen Bilimleri",
              kind: "wrong",
              takenOn: "2026-10-16",
            },
          ],
        })}
      />,
    );
    const lead = screen.getByText(/bu kazanım için 2 soru çöz/);
    expect(lead.textContent).not.toMatch(/Mevsimlerin/);
    expect(lead.textContent).not.toMatch(/F\.8\.1\.1\.1/);
    expect(screen.getByText(/Mevsimlerin oluşumuna/)).toBeTruthy();
    expect(screen.getByText(/2 yanlış, 0 boş/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Neden bu öneri?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tamamlandı" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Kazanımlara bak" }).getAttribute("href")).toBe(
      "/ogrenci/kazanimlar",
    );
    expect(screen.queryByText(/Öneri tamamlandı|öneri tamam/i)).toBeNull();
  });

  it("keeps a model sentence out of the rule lead", () => {
    render(
      <RecommendationCard
        explanation="İstersen bugün kısa bir tekrar yapabilirsin."
        report={buildCoachingReport({
          today: "2026-10-20",
          logs: [],
          goals: [],
          exams: [],
          mistakes: [],
        })}
      />,
    );
    const lead = screen.getByText(/küçük bir soru hedefi/);
    expect(lead.textContent).not.toMatch(/kısa bir tekrar/);
    expect(screen.getByRole("heading", { name: "Sade anlatım" })).toBeTruthy();
    expect(
      screen.getByText("Bu cümle bir öneridir. Kayıtlarını ve puanını değiştirmez."),
    ).toBeTruthy();
    expect(
      screen.queryByText("Sade anlatım yok. Öneri, çalışma kayıtlarına göre hazır."),
    ).toBeNull();
  });

  it("hides Tamamlandı when a parent is reading the same outcome", () => {
    const report = buildCoachingReport({
      today: "2026-10-20",
      logs: [],
      goals: [],
      exams: [],
      mistakes: [
        {
          outcomeId: "11111111-1111-4111-8111-111111111111",
          outcomeCode: "F.8.1.1.1",
          outcomeDescription: "Mevsimlerin oluşumuna yönelik tahminlerde bulunur.",
          subjectId: "sub-fen",
          subjectName: "Fen Bilimleri",
          kind: "wrong",
          takenOn: "2026-10-18",
        },
      ],
    });
    render(<RecommendationCard audience="parent" report={report} />);
    expect(screen.getByText(/1 soru çöz/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tamamlandı" })).toBeNull();
  });
});
