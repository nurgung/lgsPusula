import "server-only";
import type { DateWindow } from "@/features/study/calendar";
import { createSessionClient } from "@/services/supabase/server-client";
import { getExam, listExams } from "@/services/supabase/exam-store";
import {
  listMistakesForExam,
  listMistakesForStudentWindow,
} from "@/services/supabase/mistake-store";
import { canShowNetTrend, prioritiseOutcomes, type OutcomePriority } from "./prioritize";

export async function loadExamMistakes(studentId: string, examId: string) {
  const session = await createSessionClient({ writable: false });
  const exam = await getExam(session, studentId, examId);
  if (!exam) return null;
  const mistakes = await listMistakesForExam(session, examId);
  return { exam, mistakes };
}

export async function loadOutcomePriorities(
  studentId: string,
  window: DateWindow,
): Promise<OutcomePriority[]> {
  const session = await createSessionClient({ writable: false });
  const mistakes = await listMistakesForStudentWindow(session, studentId, window);
  return prioritiseOutcomes(mistakes);
}

export type NetTrendPoint = {
  examId: string;
  title: string;
  takenOn: string;
  totalNet: number;
};

export async function loadNetTrend(
  studentId: string,
  window: DateWindow,
): Promise<{ points: NetTrendPoint[]; showChart: boolean }> {
  const session = await createSessionClient({ writable: false });
  const exams = await listExams(session, studentId, window);
  const points = [...exams]
    .sort(
      (a, b) =>
        a.takenOn.localeCompare(b.takenOn) || a.title.localeCompare(b.title, "tr"),
    )
    .map((exam) => ({
      examId: exam.id,
      title: exam.title,
      takenOn: exam.takenOn,
      totalNet: exam.totalNet,
    }));
  return { points, showChart: canShowNetTrend(points.length) };
}
