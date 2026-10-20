import "server-only";
import { outcomeAnalysisWindow } from "@/features/outcomes/window";
import { recentListWindow } from "@/features/study/calendar";
import { listStudyGoals, listStudyLogs } from "@/services/supabase/study-store";
import { listExams } from "@/services/supabase/exam-store";
import { listMistakesForStudentWindow } from "@/services/supabase/mistake-store";
import { createSessionClient } from "@/services/supabase/server-client";
import { buildCoachingReport, type CoachingReport } from "./rules";

/**
 * Reads the signed-in student's own rows and builds a recommendation.
 * The student id comes from the session caller. RLS is the second check.
 * No coaching row is written.
 */
export async function loadCoachingReport(
  studentId: string,
  today: string,
): Promise<CoachingReport> {
  const practiceWindow = recentListWindow(today);
  const examWindow = outcomeAnalysisWindow(today);
  const session = await createSessionClient({ writable: false });
  const [logs, goals, exams, mistakes] = await Promise.all([
    listStudyLogs(session, studentId, practiceWindow),
    listStudyGoals(session, studentId),
    listExams(session, studentId, examWindow),
    listMistakesForStudentWindow(session, studentId, examWindow),
  ]);
  return buildCoachingReport({
    today,
    logs,
    goals,
    exams: exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      takenOn: exam.takenOn,
      examType: exam.examType,
      totalNet: exam.totalNet,
    })),
    mistakes,
  });
}
