"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/features/access/guards";
import { withCelebrationParam } from "@/features/home/celebration-token";
import { celebrationToken, readCelebrationBaseline } from "@/features/home/issue-celebration";
import { fieldErrorsFrom } from "@/features/auth/schemas";
import { decodeSelection } from "@/features/curriculum/catalog";
import { createSessionClient } from "@/services/supabase/server-client";
import {
  deleteStudyGoal,
  deleteStudyLog,
  findStudyLogByRequestId,
  getStudyLog,
  insertStudyLog,
  readPlacementFacts,
  readSubjectState,
  saveStudyGoal,
  StudyStoreError,
  updateStudyLog,
} from "@/services/supabase/study-store";
import { commitStudyLog } from "./commit-log";
import type { StudyFormState } from "./form-state";
import { PLACEMENT_MESSAGES, STUDY_MESSAGES } from "./messages";
import { resolveStudyPlacement } from "./placement";
import { istanbulToday } from "./calendar";
import { studyGoalSchema, studyLogRequestSchema, studyLogSchema } from "./schemas";

const LOG_FIELDS = [
  "studiedOn",
  "subjectId",
  "catalogItem",
  "questionCount",
  "correctCount",
  "wrongCount",
  "blankCount",
  "durationMinutes",
] as const;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function valuesOf(formData: FormData, names: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of names) values[name] = text(formData, name);
  return values;
}

function providerError(error: unknown, values?: Record<string, string>): StudyFormState {
  if (!(error instanceof StudyStoreError)) throw error;
  console.error(error.message);
  return { status: "error", message: STUDY_MESSAGES.providerError, values };
}

export async function createStudyLogAction(
  _previous: StudyFormState,
  formData: FormData,
): Promise<StudyFormState> {
  const user = await requireStudent();
  const values = valuesOf(formData, LOG_FIELDS);
  const requestId = text(formData, "requestId");
  const parsed = studyLogSchema(istanbulToday()).safeParse(values);
  const request = studyLogRequestSchema.safeParse(requestId);
  if (!parsed.success || !request.success) {
    return {
      status: "error",
      message: STUDY_MESSAGES.formInvalid,
      fieldErrors: {
        ...(parsed.success ? {} : fieldErrorsFrom(parsed.error)),
        ...(request.success ? {} : { requestId: request.error.issues[0]?.message ?? "" }),
      },
      values,
    };
  }

  let celebration: string | null = null;
  try {
    const session = await createSessionClient({ writable: true });
    const today = istanbulToday();
    const before = await readCelebrationBaseline(session, user.id, today);
    const selection = decodeSelection(parsed.data.catalogItem);
    const facts = await readPlacementFacts(session, parsed.data.subjectId, selection);
    const placement = resolveStudyPlacement({
      subjectId: parsed.data.subjectId,
      selection,
      facts,
    });
    if (!placement.ok) {
      return {
        status: "error",
        message: STUDY_MESSAGES.formInvalid,
        fieldErrors: { [placement.field]: PLACEMENT_MESSAGES[placement.code] },
        values,
      };
    }

    const result = await commitStudyLog(
      {
        studentId: user.id,
        studiedOn: parsed.data.studiedOn,
        subjectId: parsed.data.subjectId,
        topicId: placement.topicId,
        outcomeId: placement.outcomeId,
        questionCount: parsed.data.questionCount,
        correctCount: parsed.data.correctCount,
        wrongCount: parsed.data.wrongCount,
        blankCount: parsed.data.blankCount,
        durationMinutes: parsed.data.durationMinutes,
        requestId: request.data,
      },
      {
        insert: (row) => insertStudyLog(session, row),
        findByRequestId: (studentId, id) =>
          findStudyLogByRequestId(session, studentId, id),
      },
    );
    if (result.status === "conflict") {
      return { status: "error", message: STUDY_MESSAGES.conflict, values };
    }
    if (result.status === "created") {
      celebration = await celebrationToken(session, user.id, today, before);
    }
  } catch (error) {
    return providerError(error, values);
  }

  refresh();
  redirect(withCelebrationParam("/ogrenci/calisma?durum=kaydedildi", celebration));
}

export async function updateStudyLogAction(
  _previous: StudyFormState,
  formData: FormData,
): Promise<StudyFormState> {
  const user = await requireStudent();
  const values = valuesOf(formData, LOG_FIELDS);
  const logId = text(formData, "logId");
  const parsed = studyLogSchema(istanbulToday()).safeParse(values);
  const id = studyLogRequestSchema.safeParse(logId);
  if (!parsed.success || !id.success) {
    return {
      status: "error",
      message: id.success ? STUDY_MESSAGES.formInvalid : STUDY_MESSAGES.notFound,
      fieldErrors: parsed.success ? {} : fieldErrorsFrom(parsed.error),
      values,
    };
  }

  let celebration: string | null = null;
  try {
    const session = await createSessionClient({ writable: true });
    const today = istanbulToday();
    const before = await readCelebrationBaseline(session, user.id, today);
    const existing = await getStudyLog(session, user.id, id.data);
    if (!existing) return { status: "error", message: STUDY_MESSAGES.notFound, values };

    const selection = decodeSelection(parsed.data.catalogItem);
    const facts = await readPlacementFacts(session, parsed.data.subjectId, selection);
    const placement = resolveStudyPlacement({
      subjectId: parsed.data.subjectId,
      selection,
      facts,
      previous: {
        subjectId: existing.subjectId,
        topicId: existing.topicId,
        outcomeId: existing.outcomeId,
      },
    });
    if (!placement.ok) {
      return {
        status: "error",
        message: STUDY_MESSAGES.formInvalid,
        fieldErrors: { [placement.field]: PLACEMENT_MESSAGES[placement.code] },
        values,
      };
    }

    const updated = await updateStudyLog(session, id.data, {
      studentId: user.id,
      studiedOn: parsed.data.studiedOn,
      subjectId: parsed.data.subjectId,
      topicId: placement.topicId,
      outcomeId: placement.outcomeId,
      questionCount: parsed.data.questionCount,
      correctCount: parsed.data.correctCount,
      wrongCount: parsed.data.wrongCount,
      blankCount: parsed.data.blankCount,
      durationMinutes: parsed.data.durationMinutes,
    });
    if (updated === "not_found") {
      return { status: "error", message: STUDY_MESSAGES.notFound, values };
    }
    celebration = await celebrationToken(session, user.id, today, before);
  } catch (error) {
    return providerError(error, values);
  }

  refresh();
  redirect(withCelebrationParam("/ogrenci/calisma?durum=guncellendi", celebration));
}

export async function deleteStudyLogAction(
  _previous: StudyFormState,
  formData: FormData,
): Promise<StudyFormState> {
  const user = await requireStudent();
  const logId = text(formData, "logId");
  if (!studyLogRequestSchema.safeParse(logId).success) {
    return { status: "error", message: STUDY_MESSAGES.notFound };
  }
  try {
    const session = await createSessionClient({ writable: true });
    const deleted = await deleteStudyLog(session, user.id, logId);
    if (deleted === "not_found")
      return { status: "error", message: STUDY_MESSAGES.notFound };
  } catch (error) {
    return providerError(error);
  }
  refresh();
  redirect("/ogrenci/calisma?durum=silindi");
}

export async function saveStudyGoalAction(
  _previous: StudyFormState,
  formData: FormData,
): Promise<StudyFormState> {
  const user = await requireStudent();
  const values = valuesOf(formData, ["period", "subjectId", "targetQuestions"]);
  const parsed = studyGoalSchema().safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: STUDY_MESSAGES.formInvalid,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const subjectId = parsed.data.subjectId === "" ? null : parsed.data.subjectId;
  try {
    const session = await createSessionClient({ writable: true });
    if (subjectId) {
      const state = await readSubjectState(session, subjectId);
      if (state !== "active") {
        return {
          status: "error",
          message: STUDY_MESSAGES.formInvalid,
          fieldErrors: {
            subjectId:
              state === "archived"
                ? PLACEMENT_MESSAGES.subject_archived
                : PLACEMENT_MESSAGES.subject_missing,
          },
          values,
        };
      }
    }
    await saveStudyGoal(session, {
      studentId: user.id,
      period: parsed.data.period,
      subjectId,
      targetQuestions: parsed.data.targetQuestions,
    });
  } catch (error) {
    return providerError(error, values);
  }

  refresh();
  redirect("/ogrenci/hedefler?durum=kaydedildi");
}

export async function deleteStudyGoalAction(
  _previous: StudyFormState,
  formData: FormData,
): Promise<StudyFormState> {
  const user = await requireStudent();
  const goalId = text(formData, "goalId");
  if (!studyLogRequestSchema.safeParse(goalId).success) {
    return { status: "error", message: STUDY_MESSAGES.notFound };
  }
  try {
    const session = await createSessionClient({ writable: true });
    const deleted = await deleteStudyGoal(session, user.id, goalId);
    if (deleted === "not_found")
      return { status: "error", message: STUDY_MESSAGES.notFound };
  } catch (error) {
    return providerError(error);
  }
  refresh();
  redirect("/ogrenci/hedefler?durum=silindi");
}
