"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStudent } from "@/features/access/guards";
import { CELEBRATION_TTL_MS, signCelebration, withCelebrationParam } from "@/features/home/celebration-token";
import { istanbulToday } from "@/features/study/calendar";
import { requireSupabaseConfig } from "@/services/supabase/config";
import { CoachingStoreError, savePracticeCompletion } from "@/services/supabase/coaching-store";
import { createSessionClient } from "@/services/supabase/server-client";
import type { PracticeFormState } from "./form-state";
import { loadCoachingReport } from "./load-coaching";
import { COACHING_MESSAGES } from "./messages";
import { acceptedPractice } from "./rules";

export async function completePracticeAction(
  _previous: PracticeFormState,
  formData: FormData,
): Promise<PracticeFormState> {
  const user = await requireStudent();
  const posted = z.uuid().safeParse(formData.get("outcomeId"));
  if (!posted.success) {
    return { status: "error", message: COACHING_MESSAGES.completeStale };
  }

  const report = await loadCoachingReport(user.id, istanbulToday());
  const practice = acceptedPractice(report, posted.data);
  if (!practice) {
    return { status: "error", message: COACHING_MESSAGES.completeStale };
  }

  try {
    const session = await createSessionClient({ writable: true });
    await savePracticeCompletion(
      session,
      user.id,
      practice.outcomeId,
      practice.questionCount,
    );
  } catch (error) {
    if (!(error instanceof CoachingStoreError)) throw error;
    console.error(error.message);
    return { status: "error", message: COACHING_MESSAGES.completeFailed };
  }

  let cheer: string | null = null;
  try {
    cheer = signCelebration(
      {
        studentId: user.id,
        kind: { reason: "practice" },
        expiresAt: Date.now() + CELEBRATION_TTL_MS,
      },
      requireSupabaseConfig().authSecret,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.name : "practice-cheer");
  }

  refresh();
  redirect(withCelebrationParam("/ogrenci", cheer, "alkis"));
}
