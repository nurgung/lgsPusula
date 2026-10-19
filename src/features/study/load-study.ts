import "server-only";
import { createSessionClient } from "@/services/supabase/server-client";
import { listStudyGoals, listStudyLogs } from "@/services/supabase/study-store";
import type { DateWindow } from "./calendar";
import type { StudyGoalView, StudyLogView } from "./summary";

/** Reads logs and goals as the signed-in user. RLS still limits the rows. */
export async function loadStudyRecords(
  studentId: string,
  window: DateWindow,
): Promise<{ logs: StudyLogView[]; goals: StudyGoalView[] }> {
  const session = await createSessionClient({ writable: false });
  const [logs, goals] = await Promise.all([
    listStudyLogs(session, studentId, window),
    listStudyGoals(session, studentId),
  ]);
  return { logs, goals };
}
