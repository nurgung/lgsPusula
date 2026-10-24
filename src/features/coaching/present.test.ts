import { describe, expect, it } from "vitest";
import { buildCoachingReport } from "./rules";
import { studentVisibleEvidence, studentVisibleReason } from "./present";

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
