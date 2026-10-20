import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { MistakeKind } from "@/features/outcomes/prioritize";
import {
  MANUAL_CONFIDENCE,
  MANUAL_SOURCE,
  type MISTAKE_CONFIDENCES,
  type MISTAKE_SOURCES,
} from "@/features/outcomes/schemas";
import type { DateWindow } from "@/features/study/calendar";

export class MistakeStoreError extends Error {
  constructor(operation: string, code?: string) {
    super(`Mistake operation failed: ${operation}${code ? ` (${code})` : ""}`);
    this.name = "MistakeStoreError";
  }
}

const PAGE_SIZE = 500;

const mistakeRowSchema = z.object({
  id: z.uuid(),
  exam_subject_result_id: z.uuid(),
  learning_outcome_id: z.uuid(),
  mistake_kind: z.enum(["wrong", "blank"]),
  source: z.enum(["manual"]),
  confidence: z.enum(["high", "medium", "low"]),
  sort_order: z.number().int(),
});

export type StoredMistake = {
  id: string;
  resultId: string;
  outcomeId: string;
  kind: MistakeKind;
  source: (typeof MISTAKE_SOURCES)[number];
  confidence: (typeof MISTAKE_CONFIDENCES)[number];
  sortOrder: number;
};

export type MistakeWriteRow = {
  resultId: string;
  outcomeId: string;
  kind: MistakeKind;
  sortOrder: number;
  source: typeof MANUAL_SOURCE;
  confidence: typeof MANUAL_CONFIDENCE;
};

export type MistakeAnalysisRow = {
  outcomeId: string;
  outcomeCode: string;
  outcomeDescription: string;
  subjectId: string;
  subjectName: string;
  kind: MistakeKind;
  takenOn: string;
  examId: string;
  examTitle: string;
};

function fail(operation: string, error: PostgrestError | null): never {
  throw new MistakeStoreError(operation, error?.code);
}

function toStored(row: z.infer<typeof mistakeRowSchema>): StoredMistake {
  return {
    id: row.id,
    resultId: row.exam_subject_result_id,
    outcomeId: row.learning_outcome_id,
    kind: row.mistake_kind,
    source: row.source,
    confidence: row.confidence,
    sortOrder: row.sort_order,
  };
}

export async function listMistakesForExam(
  client: SupabaseClient,
  examId: string,
): Promise<StoredMistake[]> {
  const { data: results, error: resultsError } = await client
    .from("exam_subject_results")
    .select("id")
    .eq("exam_id", examId)
    .limit(PAGE_SIZE);
  if (resultsError) fail("list_exam_results", resultsError);
  const resultIds = (results ?? []).map(
    (row) => z.object({ id: z.uuid() }).parse(row).id,
  );
  if (resultIds.length === 0) return [];

  const { data, error } = await client
    .from("exam_mistakes")
    .select(
      "id, exam_subject_result_id, learning_outcome_id, mistake_kind, source, confidence, sort_order",
    )
    .in("exam_subject_result_id", resultIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(PAGE_SIZE);
  if (error) fail("list_mistakes", error);
  return (data ?? []).map((row) => toStored(mistakeRowSchema.parse(row)));
}

/**
 * Replaces every mistake row for the given exam subject results. Only the student
 * who owns the exam may call this (enforced by RLS + caller).
 */
export async function replaceMistakesForResults(
  client: SupabaseClient,
  resultIds: readonly string[],
  rows: readonly MistakeWriteRow[],
): Promise<void> {
  if (resultIds.length > 0) {
    const { error: deleteError } = await client
      .from("exam_mistakes")
      .delete()
      .in("exam_subject_result_id", [...resultIds]);
    if (deleteError) fail("delete_mistakes", deleteError);
  }
  if (rows.length === 0) return;

  const { error } = await client.from("exam_mistakes").insert(
    rows.map((row) => ({
      exam_subject_result_id: row.resultId,
      learning_outcome_id: row.outcomeId,
      mistake_kind: row.kind,
      source: row.source,
      confidence: row.confidence,
      sort_order: row.sortOrder,
    })),
  );
  if (error) fail("insert_mistakes", error);
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listMistakesForStudentWindow(
  client: SupabaseClient,
  studentId: string,
  window: DateWindow,
): Promise<MistakeAnalysisRow[]> {
  const { data: exams, error: examsError } = await client
    .from("exams")
    .select("id, title, taken_on")
    .eq("student_id", studentId)
    .gte("taken_on", window.from)
    .lte("taken_on", window.to)
    .order("taken_on", { ascending: true })
    .limit(PAGE_SIZE);
  if (examsError) fail("list_exams_for_mistakes", examsError);
  const examRows = (exams ?? []).map((row) =>
    z.object({ id: z.uuid(), title: z.string(), taken_on: z.string() }).parse(row),
  );
  if (examRows.length === 0) return [];

  const examById = new Map(examRows.map((row) => [row.id, row]));
  const { data: results, error: resultsError } = await client
    .from("exam_subject_results")
    .select("id, exam_id, subject_id, subjects(id, name)")
    .in(
      "exam_id",
      examRows.map((row) => row.id),
    )
    .limit(PAGE_SIZE);
  if (resultsError) fail("list_results_for_mistakes", resultsError);

  type ResultMeta = {
    examId: string;
    subjectId: string;
    subjectName: string;
  };
  const resultMeta = new Map<string, ResultMeta>();
  for (const raw of results ?? []) {
    const parsed = z
      .object({
        id: z.uuid(),
        exam_id: z.uuid(),
        subject_id: z.uuid(),
        subjects: z
          .union([
            z.object({ id: z.uuid(), name: z.string() }),
            z.array(z.object({ id: z.uuid(), name: z.string() })),
          ])
          .nullable(),
      })
      .parse(raw);
    const subject = asOne(parsed.subjects);
    if (!subject) continue;
    resultMeta.set(parsed.id, {
      examId: parsed.exam_id,
      subjectId: subject.id,
      subjectName: subject.name,
    });
  }
  const resultIds = [...resultMeta.keys()];
  if (resultIds.length === 0) return [];

  const { data: mistakes, error: mistakesError } = await client
    .from("exam_mistakes")
    .select(
      "exam_subject_result_id, mistake_kind, learning_outcomes(id, code, description)",
    )
    .in("exam_subject_result_id", resultIds)
    .limit(PAGE_SIZE);
  if (mistakesError) fail("list_mistakes_window", mistakesError);

  const rows: MistakeAnalysisRow[] = [];
  for (const raw of mistakes ?? []) {
    const parsed = z
      .object({
        exam_subject_result_id: z.uuid(),
        mistake_kind: z.enum(["wrong", "blank"]),
        learning_outcomes: z
          .union([
            z.object({ id: z.uuid(), code: z.string(), description: z.string() }),
            z.array(
              z.object({ id: z.uuid(), code: z.string(), description: z.string() }),
            ),
          ])
          .nullable(),
      })
      .parse(raw);
    const meta = resultMeta.get(parsed.exam_subject_result_id);
    const outcome = asOne(parsed.learning_outcomes);
    const exam = meta ? examById.get(meta.examId) : undefined;
    if (!meta || !outcome || !exam) continue;
    rows.push({
      outcomeId: outcome.id,
      outcomeCode: outcome.code,
      outcomeDescription: outcome.description,
      subjectId: meta.subjectId,
      subjectName: meta.subjectName,
      kind: parsed.mistake_kind,
      takenOn: exam.taken_on,
      examId: exam.id,
      examTitle: exam.title,
    });
  }
  return rows;
}
