import "server-only";
import { createSessionClient } from "@/services/supabase/server-client";
import {
  listStudyGoals,
  listStudyLogs,
  listStudyContributions,
} from "@/services/supabase/study-store";
import { STUDY_DATE_MIN, type DateWindow } from "./calendar";
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

/** Every counted practice day from the earliest allowed date through today. */
export async function loadStudyContributions(
  studentId: string,
  today: string,
): Promise<{ studiedOn: string; questionCount: number }[]> {
  const session = await createSessionClient({ writable: false });
  const window: DateWindow = { from: STUDY_DATE_MIN, to: today };
  return listStudyContributions(session, studentId, window);
}
