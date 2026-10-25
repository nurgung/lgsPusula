import { describe, expect, it, vi } from "vitest";
import { COACHING_RULE_VERSION } from "@/features/coaching/constants";
import type { CoachingReport } from "@/features/coaching/rules";
import { coachingBrief } from "./brief";
import { explainRecommendation } from "./explain";
import { readExplanation } from "./output";

const report: CoachingReport = {
  ruleVersion: COACHING_RULE_VERSION,
  today: "2026-10-22",
  practiceWindow: { from: "2026-10-09", to: "2026-10-22" },
  examWindow: { from: "2026-07-24", to: "2026-10-22" },
  metrics: {
    goals: [],
    subjectAccuracy: [],
    examChange: { sufficient: false, fullExamCount: 0 },
    reviewOutcomes: [],
  },
  recommendation: {
    ruleId: "coaching.hold",
    ruleVersion: COACHING_RULE_VERSION,
    message: "Şu an belirli bir tekrar önerecek kadar açık bir işaret yok.",
    reason: "Eksik kayıttan ders sonucu çıkarılmaz.",
    evidence: [
      "Öğrenci 11111111-1111-4111-8111-111111111111 ve ada@example.com yazılmasın.",
    ],
    href: "/ogrenci/denemeler/22222222-2222-4222-8222-222222222222",
    actionLabel: "Kayıt yaz",
    practice: null,
  },
};

describe("coaching brief", () => {
  it("drops account ids, mail addresses and the link", () => {
    const brief = coachingBrief(report);
    const packed = JSON.stringify(brief);
    expect(packed).not.toContain("11111111");
    expect(packed).not.toContain("22222222");
    expect(packed).not.toContain("example.com");
    expect(packed).not.toContain("/ogrenci");
    expect(brief.ruleId).toBe("coaching.hold");
  });
});

describe("model output", () => {
  it("keeps a short sentence and refuses scores, roles and queries", () => {
    expect(
      readExplanation('{"text":"Bu hafta matematik çalışması faydalı olabilir."}'),
    ).toBe("Bu hafta matematik çalışması faydalı olabilir.");
    expect(
      readExplanation(
        '{"text":"Tamam.","totalNet":90,"role":"admin","sql":"drop table profiles"}',
      ),
    ).toBeNull();
    expect(readExplanation('{"text":"Bak: https://evil.example"}')).toBeNull();
    expect(readExplanation('{"text":"Yine çalışmadın."}')).toBeNull();
  });
});

describe("explainRecommendation", () => {
  it("returns the same rule report when the model is off, slow, or over quota", async () => {
    const complete = vi.fn();
    for (const patch of [
      { enabled: false, zdrConfirmed: true, remaining: 3 },
      { enabled: true, zdrConfirmed: false, remaining: 3 },
      { enabled: true, zdrConfirmed: true, remaining: 0 },
    ]) {
      const result = await explainRecommendation({
        report,
        complete,
        ...patch,
      });
      expect(result.source).toBe("rules");
      expect(result.explanation).toBeNull();
      expect(result.report).toBe(report);
    }
    expect(complete).not.toHaveBeenCalled();

    const timedOut = await explainRecommendation({
      report,
      enabled: true,
      zdrConfirmed: true,
      remaining: 2,
      complete: async () => ({ ok: false, reason: "timeout" }),
    });
    expect(timedOut.source).toBe("rules");

    const quota = await explainRecommendation({
      report,
      enabled: true,
      zdrConfirmed: true,
      remaining: 2,
      complete: async () => ({ ok: false, reason: "quota" }),
    });
    expect(quota.source).toBe("rules");
    expect(quota.report.recommendation).toEqual(report.recommendation);

    const failed = await explainRecommendation({
      report,
      enabled: true,
      zdrConfirmed: true,
      remaining: 2,
      complete: async () => ({ ok: false, reason: "error" }),
    });
    expect(failed.source).toBe("rules");
    expect(failed.explanation).toBeNull();
    expect(failed.report).toBe(report);
  });

  it("keeps the rule card when the call throws", async () => {
    const result = await explainRecommendation({
      report,
      enabled: true,
      zdrConfirmed: true,
      remaining: 2,
      complete: async () => {
        throw new Error("network");
      },
    });
    expect(result.source).toBe("rules");
    expect(result.explanation).toBeNull();
    expect(result.report).toBe(report);
  });

  it("shows a sentence without letting the model replace the rule", async () => {
    const result = await explainRecommendation({
      report,
      enabled: true,
      zdrConfirmed: true,
      remaining: 1,
      complete: async () => ({
        ok: true,
        body: '{"text":"İstersen bugün kısa bir tekrar yapabilirsin.","ruleId":"other","totalNet":0}',
      }),
    });
    expect(result.source).toBe("rules");
    expect(result.report.recommendation.ruleId).toBe("coaching.hold");
    expect(result.explanation).toBeNull();
  });

  it("attaches a valid sentence beside the original rule", async () => {
    const result = await explainRecommendation({
      report,
      enabled: true,
      zdrConfirmed: true,
      remaining: 1,
      complete: async () => ({
        ok: true,
        body: '{"text":"İstersen bugün kısa bir tekrar yapabilirsin."}',
      }),
    });
    expect(result.source).toBe("model");
    expect(result.explanation).toBe("İstersen bugün kısa bir tekrar yapabilirsin.");
    expect(result.report).toBe(report);
  });
});
