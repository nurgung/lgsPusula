import "server-only";
import type { DateWindow } from "@/features/study/calendar";
import { createSessionClient } from "@/services/supabase/server-client";
import {
  getExam,
  listExams,
  listExamsWithSubjects,
  listSubjectIdByCode,
} from "@/services/supabase/exam-store";

export async function loadExamList(studentId: string, window: DateWindow) {
  const session = await createSessionClient({ writable: false });
  return listExams(session, studentId, window);
}

export async function loadExamListWithSubjects(studentId: string, window: DateWindow) {
  const session = await createSessionClient({ writable: false });
  return listExamsWithSubjects(session, studentId, window);
}

export async function loadExamDetail(studentId: string, examId: string) {
  const session = await createSessionClient({ writable: false });
  return getExam(session, studentId, examId);
}

export async function loadSubjectIdsByCode() {
  const session = await createSessionClient({ writable: false });
  return listSubjectIdByCode(session);
}
