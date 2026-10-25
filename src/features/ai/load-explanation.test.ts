import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachingReport } from "@/features/coaching/rules";
import { COACHING_RULE_VERSION } from "@/features/coaching/constants";
import { GROQ_MODEL } from "@/services/ai/groq";

vi.mock("@/lib/env/server", () => ({
  getServerEnv: vi.fn(),
}));

vi.mock("@/services/supabase/server-client", () => ({
  createServiceClient: vi.fn(() => ({})),
}));

vi.mock("@/services/supabase/ai-store", () => ({
  readAiEnabled: vi.fn(),
  consumeAiRequest: vi.fn(),
}));

vi.mock("@/services/ai/groq", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/ai/groq")>("@/services/ai/groq");
  return { ...actual, completeWithGroq: vi.fn() };
});

import { loadCoachingExplanation } from "./load-explanation";
import { getServerEnv } from "@/lib/env/server";
import { consumeAiRequest, readAiEnabled } from "@/services/supabase/ai-store";
import { completeWithGroq } from "@/services/ai/groq";

const studentId = "11111111-1111-4111-8111-111111111111";
const actor = { id: studentId, roles: ["student"] as const };
const report = {
  ruleVersion: COACHING_RULE_VERSION,
  today: "2026-10-24",
  practiceWindow: { from: "2026-10-11", to: "2026-10-24" },
  examWindow: { from: "2026-07-26", to: "2026-10-24" },
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
    evidence: [`Öğrenci ${studentId} ve ada@example.com yazılmasın.`],
    href: "/ogrenci/denemeler/22222222-2222-4222-8222-222222222222",
    actionLabel: "Kayıt yaz",
    practice: null,
  },
} as CoachingReport;

const TEST_KEY = "test-key-not-sent-anywhere";

function serverEnv(open: boolean) {
  return {
    AI_ENABLED: open,
    AI_ZDR_CONFIRMED: open,
    AI_PROVIDER: "groq",
    AI_API_KEY: open ? TEST_KEY : undefined,
    AI_MODEL: GROQ_MODEL,
    AI_DAILY_REQUEST_LIMIT: 20,
  };
}

describe("loadCoachingExplanation", () => {
  beforeEach(() => {
    vi.mocked(getServerEnv).mockReset();
    vi.mocked(readAiEnabled).mockReset();
    vi.mocked(consumeAiRequest).mockReset();
    vi.mocked(completeWithGroq).mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("stays on the rule card when the switch is closed", async () => {
    vi.mocked(getServerEnv).mockReturnValue(
      serverEnv(false) as ReturnType<typeof getServerEnv>,
    );
    vi.mocked(readAiEnabled).mockResolvedValue(false);

    const result = await loadCoachingExplanation(
      actor,
      studentId,
      report,
      [],
      "2026-10-24",
    );

    expect(result.source).toBe("rules");
    expect(result.explanation).toBeNull();
    expect(result.report).toBe(report);
    expect(completeWithGroq).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stays on the rule card when the student switch is off", async () => {
    vi.mocked(getServerEnv).mockReturnValue(
      serverEnv(true) as ReturnType<typeof getServerEnv>,
    );
    vi.mocked(readAiEnabled).mockResolvedValue(false);

    const result = await loadCoachingExplanation(
      actor,
      studentId,
      report,
      [],
      "2026-10-24",
    );

    expect(result.source).toBe("rules");
    expect(result.explanation).toBeNull();
    expect(completeWithGroq).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("attaches a mocked sentence without calling the network", async () => {
    vi.mocked(getServerEnv).mockReturnValue(
      serverEnv(true) as ReturnType<typeof getServerEnv>,
    );
    vi.mocked(readAiEnabled).mockResolvedValue(true);
    vi.mocked(consumeAiRequest).mockResolvedValue(true);
    vi.mocked(completeWithGroq).mockResolvedValue({
      ok: true,
      body: '{"text":"İstersen bugün kısa bir tekrar yapabilirsin."}',
    });

    const result = await loadCoachingExplanation(
      actor,
      studentId,
      report,
      [],
      "2026-10-24",
    );

    expect(result.source).toBe("model");
    expect(result.explanation).toBe("İstersen bugün kısa bir tekrar yapabilirsin.");
    expect(result.report.recommendation.ruleId).toBe("coaching.hold");
    expect(fetch).not.toHaveBeenCalled();
    const [brief, options] = vi.mocked(completeWithGroq).mock.calls[0] ?? [];
    expect(JSON.stringify(brief)).not.toContain(TEST_KEY);
    expect(JSON.stringify(brief)).not.toContain(studentId);
    expect(JSON.stringify(brief)).not.toContain("example.com");
    expect(options).toMatchObject({ apiKey: TEST_KEY });
  });

  it("keeps the rule card when the model call fails", async () => {
    vi.mocked(getServerEnv).mockReturnValue(
      serverEnv(true) as ReturnType<typeof getServerEnv>,
    );
    vi.mocked(readAiEnabled).mockResolvedValue(true);
    vi.mocked(consumeAiRequest).mockResolvedValue(true);
    vi.mocked(completeWithGroq).mockResolvedValue({ ok: false, reason: "error" });

    const result = await loadCoachingExplanation(
      actor,
      studentId,
      report,
      [],
      "2026-10-24",
    );

    expect(result.source).toBe("rules");
    expect(result.explanation).toBeNull();
    expect(result.report).toBe(report);
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(TEST_KEY);
  });

  it("logs a read failure and still returns the rule card", async () => {
    vi.mocked(getServerEnv).mockReturnValue(
      serverEnv(true) as ReturnType<typeof getServerEnv>,
    );
    vi.mocked(readAiEnabled).mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await loadCoachingExplanation(
      actor,
      studentId,
      report,
      [],
      "2026-10-24",
    );

    expect(result.source).toBe("rules");
    expect(result.explanation).toBeNull();
    expect(spy).toHaveBeenCalledWith("Error");
    expect(completeWithGroq).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not put the model key in the public environment", () => {
    const source = readFileSync("src/lib/env/public.ts", "utf8");
    expect(source).not.toContain("AI_API_KEY");
    expect(source).not.toContain("AI_ENABLED");
  });
});
