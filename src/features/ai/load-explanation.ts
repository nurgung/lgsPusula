import "server-only";
import {
  canReadStudentRecord,
  type AccessActor,
  type ActiveStudentLink,
} from "@/features/access/student-access";
import type { CoachingReport } from "@/features/coaching/rules";
import { getServerEnv } from "@/lib/env/server";
import { GROQ_CHAT_URL, GROQ_MODEL, completeWithGroq } from "@/services/ai/groq";
import { consumeAiRequest, readAiEnabled } from "@/services/supabase/ai-store";
import { createServiceClient } from "@/services/supabase/server-client";
import { explainRecommendation, type ExplainedCoaching } from "./explain";

function rulesOnly(report: CoachingReport): ExplainedCoaching {
  return { report, explanation: null, source: "rules" };
}

/**
 * Adds an optional sentence beside a rule card. Any failure, a closed switch,
 * or a missing zero-retention confirmation leaves the rule card unchanged.
 */
export async function loadCoachingExplanation(
  actor: AccessActor,
  studentId: string,
  report: CoachingReport,
  activeLinks: readonly ActiveStudentLink[],
  today: string,
): Promise<ExplainedCoaching> {
  if (!canReadStudentRecord(actor, studentId, activeLinks)) return rulesOnly(report);
  try {
    const env = getServerEnv();
    const service = createServiceClient();
    const preference = await readAiEnabled(service, studentId);
    const configured =
      env.AI_ENABLED &&
      env.AI_ZDR_CONFIRMED &&
      env.AI_PROVIDER === "groq" &&
      Boolean(env.AI_API_KEY) &&
      (env.AI_MODEL === undefined || env.AI_MODEL === GROQ_MODEL);
    if (!configured || !preference || !env.AI_API_KEY) return rulesOnly(report);
    const apiKey = env.AI_API_KEY;
    return await explainRecommendation({
      report,
      enabled: true,
      zdrConfirmed: true,
      remaining: 1,
      complete: async (brief) => {
        const allowed = await consumeAiRequest(
          service,
          studentId,
          today,
          env.AI_DAILY_REQUEST_LIMIT,
        );
        if (!allowed) return { ok: false, reason: "quota" };
        return completeWithGroq(brief, {
          apiKey,
          model: GROQ_MODEL,
          timeoutMs: 8000,
          call: async ({ url, init }) => {
            if (url !== GROQ_CHAT_URL) return { status: 0, body: "" };
            const response = await fetch(url, init);
            return { status: response.status, body: await response.text() };
          },
        });
      },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.name : "ai_explanation");
    return rulesOnly(report);
  }
}
