import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PracticeCompletion } from "@/features/coaching/rules";

export class CoachingStoreError extends Error {
  constructor(operation: string, code?: string) {
    super(`Coaching operation failed: ${operation}${code ? ` (${code})` : ""}`);
    this.name = "CoachingStoreError";
  }
}

function fail(operation: string, error: PostgrestError): never {
  throw new CoachingStoreError(operation, error.code);
}

const completionRow = z.object({
  learning_outcome_id: z.uuid(),
  question_count: z.number().int(),
});

export async function listPracticeCompletions(
  client: SupabaseClient,
  studentId: string,
): Promise<PracticeCompletion[]> {
  const { data, error } = await client
    .from("coaching_practice_completions")
    .select("learning_outcome_id, question_count")
    .eq("student_id", studentId);
  if (error) fail("list_practice_completions", error);
  return (data ?? []).map((row) => {
    const parsed = completionRow.parse(row);
    return { outcomeId: parsed.learning_outcome_id, questionCount: parsed.question_count };
  });
}

/**
 * Covers this linked-question count. A later higher count can be written again.
 * A stored count is never lowered, so removing a link does not reopen the outcome.
 * Insert and update stay separate: the student cannot change the outcome id.
 */
export async function savePracticeCompletion(
  client: SupabaseClient,
  studentId: string,
  outcomeId: string,
  questionCount: number,
): Promise<void> {
  const row = {
    student_id: studentId,
    learning_outcome_id: outcomeId,
    question_count: questionCount,
    completed_at: new Date().toISOString(),
  };
  const inserted = await client.from("coaching_practice_completions").insert(row);
  if (!inserted.error) return;
  if (inserted.error.code !== "23505") fail("save_practice_completion", inserted.error);

  const updated = await client
    .from("coaching_practice_completions")
    .update({
      question_count: questionCount,
      completed_at: row.completed_at,
    })
    .eq("student_id", studentId)
    .eq("learning_outcome_id", outcomeId)
    .lt("question_count", questionCount);
  if (updated.error) fail("save_practice_completion", updated.error);
}
