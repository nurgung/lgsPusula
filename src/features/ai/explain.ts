import type { CoachingReport } from "@/features/coaching/rules";
import { coachingBrief, type AiBrief } from "./brief";
import { readExplanation } from "./output";

export type AiCallResult =
  { ok: true; body: string } | { ok: false; reason: "timeout" | "quota" | "error" };

export type ExplainedCoaching = {
  report: CoachingReport;
  explanation: string | null;
  source: "rules" | "model";
};

export type ExplainInput = {
  report: CoachingReport;
  /** Server env and the student's own switch must both be on. */
  enabled: boolean;
  /** Owner confirmed zero data retention in the Groq panel. */
  zdrConfirmed: boolean;
  remaining: number;
  complete: (brief: AiBrief) => Promise<AiCallResult>;
};

/**
 * The rule report is always returned unchanged. A model sentence is optional display
 * text. Timeout, quota, a bad body, or a closed switch leave the rule card alone.
 */
export async function explainRecommendation(
  input: ExplainInput,
): Promise<ExplainedCoaching> {
  const rules: ExplainedCoaching = {
    report: input.report,
    explanation: null,
    source: "rules",
  };
  if (!input.enabled || !input.zdrConfirmed || input.remaining < 1) return rules;
  let result: AiCallResult;
  try {
    result = await input.complete(coachingBrief(input.report));
  } catch {
    return rules;
  }
  if (!result.ok) return rules;
  const explanation = readExplanation(result.body);
  if (!explanation) return rules;
  return { report: input.report, explanation, source: "model" };
}
