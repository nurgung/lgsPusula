"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/features/access/guards";
import { withCelebrationParam } from "@/features/home/celebration-token";
import { celebrationToken, readCelebrationBaseline } from "@/features/home/issue-celebration";
import { istanbulToday } from "@/features/study/calendar";
import { createSessionClient } from "@/services/supabase/server-client";
import {
  deleteExam,
  ExamStoreError,
  findExamByRequestId,
  getExam,
  insertExam,
  listSubjectIdByCode,
  updateExam,
} from "@/services/supabase/exam-store";
import { buildExamPayload, commitExam } from "./commit-exam";
import type { ExamFormState } from "./form-state";
import { EXAM_MESSAGES } from "./messages";
import { CURRENT_RULE_VERSION } from "./net-rules";
import { examRequestSchema, parseExamInput } from "./schemas";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function valuesFrom(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

function providerError(error: unknown, values?: Record<string, string>): ExamFormState {
  if (!(error instanceof ExamStoreError)) throw error;
  console.error(error.message);
  return { status: "error", message: EXAM_MESSAGES.providerError, values };
}

export async function createExamAction(
  _previous: ExamFormState,
  formData: FormData,
): Promise<ExamFormState> {
  const user = await requireStudent();
  const values = valuesFrom(formData);
  const request = examRequestSchema.safeParse(text(formData, "requestId"));
  if (!request.success) {
    return {
      status: "error",
      message: EXAM_MESSAGES.formInvalid,
      fieldErrors: { requestId: request.error.issues[0]?.message ?? "" },
      values,
    };
  }

  let celebration: string | null = null;
  try {
    const session = await createSessionClient({ writable: true });
    const today = istanbulToday();
    const before = await readCelebrationBaseline(session, user.id, today);
    const subjectIds = await listSubjectIdByCode(session);
    const parsed = parseExamInput(values, today, subjectIds, CURRENT_RULE_VERSION);
    if (!parsed.ok) {
      return {
        status: "error",
        message: EXAM_MESSAGES.formInvalid,
        fieldErrors: parsed.fieldErrors,
        values,
      };
    }

    const payload = buildExamPayload(user.id, request.data, parsed.data);
    const result = await commitExam(payload, {
      insert: (row) => insertExam(session, row),
      findByRequestId: (studentId, id) => findExamByRequestId(session, studentId, id),
    });
    if (result.status === "conflict") {
      return { status: "error", message: EXAM_MESSAGES.conflict, values };
    }
    if (result.status === "created") {
      celebration = await celebrationToken(session, user.id, today, before);
    }
  } catch (error) {
    return providerError(error, values);
  }

  refresh();
  redirect(withCelebrationParam("/ogrenci/denemeler?durum=kaydedildi", celebration));
}

export async function updateExamAction(
  _previous: ExamFormState,
  formData: FormData,
): Promise<ExamFormState> {
  const user = await requireStudent();
  const values = valuesFrom(formData);
  const examId = examRequestSchema.safeParse(text(formData, "examId"));
  if (!examId.success) {
    return { status: "error", message: EXAM_MESSAGES.notFound, values };
  }

  try {
    const session = await createSessionClient({ writable: true });
    const existing = await getExam(session, user.id, examId.data);
    if (!existing) return { status: "error", message: EXAM_MESSAGES.notFound, values };

    const subjectIds = await listSubjectIdByCode(session);
    // Keep the rule version that was stored with the exam so historical papers stay put.
    const parsed = parseExamInput(
      values,
      istanbulToday(),
      subjectIds,
      existing.ruleVersion,
    );
    if (!parsed.ok) {
      return {
        status: "error",
        message: EXAM_MESSAGES.formInvalid,
        fieldErrors: parsed.fieldErrors,
        values,
      };
    }

    const payload = buildExamPayload(user.id, existing.requestId, parsed.data);
    await updateExam(session, user.id, examId.data, {
      title: payload.title,
      takenOn: payload.takenOn,
      examType: payload.examType,
      ruleVersion: payload.ruleVersion,
      totalNet: payload.totalNet,
      score: payload.score,
      subjects: payload.subjects,
    });
  } catch (error) {
    return providerError(error, values);
  }

  refresh();
  redirect(`/ogrenci/denemeler/${examId.data}?durum=guncellendi`);
}

export async function deleteExamAction(
  _previous: ExamFormState,
  formData: FormData,
): Promise<ExamFormState> {
  const user = await requireStudent();
  const examId = examRequestSchema.safeParse(text(formData, "examId"));
  if (!examId.success) {
    return { status: "error", message: EXAM_MESSAGES.notFound };
  }

  try {
    const session = await createSessionClient({ writable: true });
    const deleted = await deleteExam(session, user.id, examId.data);
    if (!deleted) return { status: "error", message: EXAM_MESSAGES.notFound };
  } catch (error) {
    return providerError(error);
  }

  refresh();
  redirect("/ogrenci/denemeler?durum=silindi");
}
