import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export class AiStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiStoreError";
  }
}

/** Missing row and any read error both mean the switch is off. */
export async function readAiEnabled(
  client: SupabaseClient,
  studentId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("ai_preferences")
    .select("enabled")
    .eq("student_id", studentId)
    .maybeSingle<{ enabled: boolean }>();
  if (error || !data) return false;
  return data.enabled === true;
}

export async function setOwnAiEnabled(
  client: SupabaseClient,
  enabled: boolean,
): Promise<void> {
  const { error } = await client.rpc("set_ai_enabled", { next_enabled: enabled });
  if (error) throw new AiStoreError("set_ai_enabled");
}

/** False when the daily cap is spent or the counter cannot be reached. */
export async function consumeAiRequest(
  client: SupabaseClient,
  studentId: string,
  day: string,
  limit: number,
): Promise<boolean> {
  const { data, error } = await client.rpc("consume_ai_request", {
    p_student: studentId,
    p_day: day,
    p_limit: limit,
  });
  if (error) return false;
  return data === true;
}
