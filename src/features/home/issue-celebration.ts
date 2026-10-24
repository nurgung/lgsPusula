import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "@/services/supabase/config";
import {
  CELEBRATION_TTL_MS,
  signCelebration,
} from "./celebration-token";
import { crossedCelebration, type ProgressSnapshot } from "./celebration";
import { readProgressSnapshot } from "./progress";

export async function readCelebrationBaseline(
  client: SupabaseClient,
  studentId: string,
  today: string,
): Promise<ProgressSnapshot | null> {
  try {
    return await readProgressSnapshot(client, studentId, today);
  } catch (error) {
    console.error(error instanceof Error ? error.name : "celebration");
    return null;
  }
}

/** Null when this write did not cross a goal, badge, or stage, or the read failed. */
export async function celebrationToken(
  client: SupabaseClient,
  studentId: string,
  today: string,
  before: ProgressSnapshot | null,
): Promise<string | null> {
  if (!before) return null;
  try {
    const after = await readProgressSnapshot(client, studentId, today);
    const kind = crossedCelebration(before, after);
    if (!kind) return null;
    return signCelebration(
      {
        studentId,
        kind,
        expiresAt: Date.now() + CELEBRATION_TTL_MS,
      },
      requireSupabaseConfig().authSecret,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.name : "celebration");
    return null;
  }
}
