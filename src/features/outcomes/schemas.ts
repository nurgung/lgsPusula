import { z } from "zod";
import { decodeSelection } from "@/features/curriculum/catalog";

export const MISTAKE_KINDS = ["wrong", "blank"] as const;
export const MISTAKE_SOURCES = ["manual"] as const;
export const MISTAKE_CONFIDENCES = ["high", "medium", "low"] as const;

export const MANUAL_SOURCE = "manual" as const;
export const MANUAL_CONFIDENCE = "high" as const;

const outcomeSelection = z
  .string()
  .trim()
  .refine((value) => {
    const decoded = decodeSelection(value);
    return decoded?.kind === "outcome";
  }, "Listeden bir kazanım seç.");

export const mistakeDraftSchema = z.object({
  resultId: z.uuid("Ders satırı bulunamadı."),
  kind: z.enum(MISTAKE_KINDS, { error: "Yanlış veya boş seç." }),
  catalogItem: outcomeSelection,
  sortOrder: z.coerce.number().int().min(0).max(200),
});

export type MistakeDraft = z.infer<typeof mistakeDraftSchema>;

export type SubjectMistakeBudget = {
  resultId: string;
  subjectId: string;
  wrongCount: number;
  blankCount: number;
};

export type OutcomePlacement = {
  id: string;
  subjectId: string;
  archived: boolean;
  topicArchived: boolean;
  subjectArchived: boolean;
};

/**
 * Validates a full replace set for one exam: each row picks an outcome, counts stay
 * within the subject wrong/blank budgets, and outcomes belong to that subject.
 */
export function parseMistakeReplaceInput(
  rows: readonly Record<string, string>[],
  budgets: readonly SubjectMistakeBudget[],
  outcomes: ReadonlyMap<string, OutcomePlacement>,
):
  | {
      ok: true;
      rows: {
        resultId: string;
        outcomeId: string;
        kind: (typeof MISTAKE_KINDS)[number];
        sortOrder: number;
        source: typeof MANUAL_SOURCE;
        confidence: typeof MANUAL_CONFIDENCE;
      }[];
    }
  | { ok: false; fieldErrors: Record<string, string>; message?: string } {
  const fieldErrors: Record<string, string> = {};
  const parsed: {
    resultId: string;
    outcomeId: string;
    kind: (typeof MISTAKE_KINDS)[number];
    sortOrder: number;
    source: typeof MANUAL_SOURCE;
    confidence: typeof MANUAL_CONFIDENCE;
  }[] = [];

  const budgetByResult = new Map(budgets.map((row) => [row.resultId, row]));
  const used: Record<string, { wrong: number; blank: number }> = {};

  rows.forEach((raw, index) => {
    const prefix = `row${index}`;
    const result = mistakeDraftSchema.safeParse({
      resultId: raw.resultId,
      kind: raw.kind,
      catalogItem: raw.catalogItem,
      sortOrder: raw.sortOrder ?? String(index),
    });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        fieldErrors[`${prefix}.${String(key)}`] = issue.message;
      }
      return;
    }

    const budget = budgetByResult.get(result.data.resultId);
    if (!budget) {
      fieldErrors[`${prefix}.resultId`] = "Bu ders satırı denemede yok.";
      return;
    }

    const selection = decodeSelection(result.data.catalogItem);
    if (!selection || selection.kind !== "outcome") {
      fieldErrors[`${prefix}.catalogItem`] = "Listeden bir kazanım seç.";
      return;
    }

    const outcome = outcomes.get(selection.id);
    if (!outcome) {
      fieldErrors[`${prefix}.catalogItem`] = "Kazanım bulunamadı.";
      return;
    }
    if (outcome.subjectId !== budget.subjectId) {
      fieldErrors[`${prefix}.catalogItem`] = "Kazanım, denemenin dersiyle aynı olmalı.";
      return;
    }
    if (outcome.archived || outcome.topicArchived || outcome.subjectArchived) {
      fieldErrors[`${prefix}.catalogItem`] =
        "Eski sürümlü kazanım yeni eşleştirmeye eklenemez.";
      return;
    }

    const tally = used[result.data.resultId] ?? { wrong: 0, blank: 0 };
    if (result.data.kind === "wrong") tally.wrong += 1;
    else tally.blank += 1;
    used[result.data.resultId] = tally;

    if (tally.wrong > budget.wrongCount || tally.blank > budget.blankCount) {
      fieldErrors[`${prefix}.kind`] =
        "Bu derste yanlış veya boş sayısından fazla eşleştirme olamaz.";
      return;
    }

    parsed.push({
      resultId: result.data.resultId,
      outcomeId: selection.id,
      kind: result.data.kind,
      sortOrder: result.data.sortOrder,
      source: MANUAL_SOURCE,
      confidence: MANUAL_CONFIDENCE,
    });
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, rows: parsed };
}
