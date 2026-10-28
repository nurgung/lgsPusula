import { describe, expect, it } from "vitest";
import { buildCoachingReport } from "./rules";
import { coachingLead, studentVisibleEvidence, studentVisibleReason } from "./present";

describe("studentVisibleReason", () => {
  it("removes the rule id and keeps the explanation", () => {
    const report = buildCoachingReport({
      today: "2026-10-20",
      logs: [],
      goals: [],
      exams: [],
      mistakes: [],
    });
    expect(report.recommendation.reason).toMatch(/Kural:/);
    const shown = studentVisibleReason(report.recommendation.reason);
    expect(shown).toMatch(/günlük hedef satırı yok/);
    expect(shown).not.toMatch(/Kural:/);
    expect(shown).not.toMatch(/coaching-v1/);
  });
});

describe("studentVisibleEvidence", () => {
  it("keeps counts and drops scoring, rule, and time-zone lines", () => {
    expect(
      studentVisibleEvidence([
        "Matematik: 2 doğru / 10 soru",
        "Öncelik puanı: 4 (yanlış 2, boş 1)",
        "Tarih: 20 Ekim 2026 · Europe/Istanbul",
        "10 sorudan az kayıtta oran yok. Doğru sayısı soru sayısının yarısından az olan ders seçilir.",
        "Kural: coaching-v1",
      ]),
    ).toEqual(["Matematik: 2 doğru / 10 soru"]);
  });
});

describe("coachingLead", () => {
  it("keeps the outcome code and description in the lead", () => {
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
    const lead = coachingLead(report.recommendation.message, report.recommendation.evidence);
    expect(lead).toMatch(
      /^Fen Bilimleri dersinde F\.8\.1\.1\.1 kazanımı şunu söyler: Mevsimlerin oluşumuna yönelik tahminlerde bulunur\./,
    );
    expect(lead).toMatch(/Bu kazanım için 1 soru çöz\./);
    expect(studentVisibleEvidence(report.recommendation.evidence).join("\n")).toMatch(
      /F\.8\.1\.1\.1/,
    );
  });

  it("leaves the date range in the evidence when the lead states the counts", () => {
    const report = buildCoachingReport({
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
          correctCount: 2,
          wrongCount: 8,
          blankCount: 0,
          durationMinutes: 20,
        },
      ],
      goals: [],
      exams: [],
      mistakes: [],
    });
    const lead = coachingLead(report.recommendation.message, report.recommendation.evidence);
    expect(lead).toMatch(/Matematik dersinde 10 sorudan 2 tanesi doğruydu/);
    expect(lead).not.toMatch(/arasında/);
    expect(lead).not.toMatch(/\d{4}/);
    expect(studentVisibleEvidence(report.recommendation.evidence).join("\n")).toMatch(/Aralık:/);
  });
});
