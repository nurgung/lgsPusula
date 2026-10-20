"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/features/access/guards";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { createSessionClient } from "@/services/supabase/server-client";
import { getExam } from "@/services/supabase/exam-store";
import {
  MistakeStoreError,
  replaceMistakesForResults,
} from "@/services/supabase/mistake-store";
import type { OutcomeFormState } from "./form-state";
import { OUTCOME_MESSAGES } from "./messages";
import { parseMistakeReplaceInput, type OutcomePlacement } from "./schemas";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function providerError(error: unknown): OutcomeFormState {
  if (!(error instanceof MistakeStoreError)) throw error;
  console.error(error.message);
  return { status: "error", message: OUTCOME_MESSAGES.providerError };
}

export async function replaceExamMistakesAction(
  _previous: OutcomeFormState,
  formData: FormData,
): Promise<OutcomeFormState> {
  const user = await requireStudent();
  const examId = text(formData, "examId");
  if (!zUuid(examId)) {
    return { status: "error", message: OUTCOME_MESSAGES.notFound };
  }

  const rowCount = Number(text(formData, "rowCount") || "0");
  if (!Number.isInteger(rowCount) || rowCount < 0 || rowCount > 200) {
    return { status: "error", message: OUTCOME_MESSAGES.formInvalid };
  }

  const drafts: Record<string, string>[] = [];
  for (let index = 0; index < rowCount; index += 1) {
    drafts.push({
      resultId: text(formData, `rows.${index}.resultId`),
      kind: text(formData, `rows.${index}.kind`),
      catalogItem: text(formData, `rows.${index}.catalogItem`),
      sortOrder: text(formData, `rows.${index}.sortOrder`) || String(index),
    });
  }

  try {
    const session = await createSessionClient({ writable: true });
    const exam = await getExam(session, user.id, examId);
    if (!exam) return { status: "error", message: OUTCOME_MESSAGES.notFound };

    const budgets = exam.subjects.map((subject) => ({
      resultId: subject.resultId,
      subjectId: subject.subjectId,
      wrongCount: subject.wrongCount,
      blankCount: subject.blankCount,
    }));

    if (
      budgets.every((row) => row.wrongCount === 0 && row.blankCount === 0) &&
      drafts.length > 0
    ) {
      return { status: "error", message: OUTCOME_MESSAGES.noMistakesToMap };
    }

    const catalog = await loadCatalog({ includeArchived: true });
    const outcomes = new Map<string, OutcomePlacement>();
    for (const subject of catalog) {
      for (const topic of subject.topics) {
        for (const outcome of topic.outcomes) {
          outcomes.set(outcome.id, {
            id: outcome.id,
            subjectId: subject.id,
            archived: outcome.archived,
            topicArchived: topic.archived,
            subjectArchived: subject.archived,
          });
        }
      }
    }

    const parsed = parseMistakeReplaceInput(drafts, budgets, outcomes);
    if (!parsed.ok) {
      return {
        status: "error",
        message: OUTCOME_MESSAGES.formInvalid,
        fieldErrors: parsed.fieldErrors,
      };
    }

    await replaceMistakesForResults(
      session,
      budgets.map((row) => row.resultId),
      parsed.rows,
    );
  } catch (error) {
    return providerError(error);
  }

  refresh();
  redirect(`/ogrenci/denemeler/${examId}/kazanimlar?durum=kaydedildi`);
}

function zUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
