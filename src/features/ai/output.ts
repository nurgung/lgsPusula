import { z } from "zod";
import { supportiveCopyIssues } from "@/features/coaching/messages";

const outputSchema = z
  .object({
    text: z.string().trim().min(1).max(400),
  })
  .strict();

/**
 * Accepts one display sentence. Extra keys (scores, roles, queries) fail the parse,
 * so they cannot be applied. The sentence is not executed.
 */
export function readExplanation(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const result = outputSchema.safeParse(parsed);
  if (!result.success) return null;
  const text = result.data.text;
  if (/https?:\/\//i.test(text) || text.includes("www.")) return null;
  if (supportiveCopyIssues(text).length > 0) return null;
  return text;
}
