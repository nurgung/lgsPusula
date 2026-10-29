import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  ExamPayload,
  ExamSubjectRow,
  StoredExam,
} from "@/features/exams/commit-exam";
import {
  isExamType,
  isNetRuleVersion,
  type ExamType,
  type NetRuleVersion,
} from "@/features/exams/net-rules";
import type { DateWindow } from "@/features/study/calendar";

export class ExamStoreError extends Error {
  constructor(operation: string, code?: string) {
    super(`Exam operation failed: ${operation}${code ? ` (${code})` : ""}`);
    this.name = "ExamStoreError";
  }
}

const PAGE_SIZE = 200;

const embeddedSubject = z
  .union([
    z.object({ name: z.string(), code: z.string() }),
    z.array(z.object({ name: z.string(), code: z.string() })),
  ])
  .nullable();

function firstSubject(
  value: z.infer<typeof embeddedSubject>,
): { name: string; code: string } | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row ?? null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new ExamStoreError("read_numeric");
}

const examRowSchema = z.object({
  id: z.uuid(),
  student_id: z.uuid(),
  title: z.string(),
  taken_on: z.string(),
  exam_type: z.string(),
  rule_version: z.string(),
  total_net: z.union([z.number(), z.string()]),
  score: z.union([z.number(), z.string()]).nullable(),
  request_id: z.uuid(),
});

function asOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return asNumber(value);
}

const subjectRowSchema = z.object({
  id: z.uuid(),
  subject_id: z.uuid(),
  question_count: z.number().int(),
  correct_count: z.number().int(),
  wrong_count: z.number().int(),
  blank_count: z.number().int(),
  net: z.union([z.number(), z.string()]),
  subjects: embeddedSubject,
});

export type ExamSubjectView = ExamSubjectRow & {
  resultId: string;
  subjectName: string;
};

export type ExamListItem = {
  id: string;
  title: string;
  takenOn: string;
  examType: ExamType;
  ruleVersion: NetRuleVersion;
  totalNet: number;
  score: number | null;
};

export type ExamDetail = ExamListItem & {
  studentId: string;
  requestId: string;
  subjects: ExamSubjectView[];
};

function fail(operation: string, error: PostgrestError | null): never {
  throw new ExamStoreError(operation, error?.code);
}

function toSubjectRow(row: z.infer<typeof subjectRowSchema>): ExamSubjectView {
  const subject = firstSubject(row.subjects);
  if (!subject) throw new ExamStoreError("read_exam_subject");
  return {
    resultId: row.id,
    subjectId: row.subject_id,
    subjectCode: subject.code,
    subjectName: subject.name,
    questionCount: row.question_count,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    blankCount: row.blank_count,
    net: asNumber(row.net),
  };
}

async function loadSubjects(
  client: SupabaseClient,
  examId: string,
): Promise<ExamSubjectView[]> {
  const { data, error } = await client
    .from("exam_subject_results")
    .select(
      "id, subject_id, question_count, correct_count, wrong_count, blank_count, net, subjects(name, code)",
    )
    .eq("exam_id", examId)
    .order("created_at", { ascending: true })
    .limit(PAGE_SIZE);
  if (error) fail("list_exam_subjects", error);
  return (data ?? []).map((row) => toSubjectRow(subjectRowSchema.parse(row)));
}

function toListItem(row: z.infer<typeof examRowSchema>): ExamListItem {
  if (!isExamType(row.exam_type) || !isNetRuleVersion(row.rule_version)) {
    throw new ExamStoreError("read_exam_type");
  }
  return {
    id: row.id,
    title: row.title,
    takenOn: row.taken_on,
    examType: row.exam_type,
    ruleVersion: row.rule_version,
    totalNet: asNumber(row.total_net),
    score: asOptionalNumber(row.score),
  };
}

function toSubjectPayload(subject: ExamSubjectView | ExamSubjectRow): ExamSubjectRow {
  return {
    subjectId: subject.subjectId,
    subjectCode: subject.subjectCode,
    questionCount: subject.questionCount,
    correctCount: subject.correctCount,
    wrongCount: subject.wrongCount,
    blankCount: subject.blankCount,
    net: subject.net,
  };
}

function toStored(
  row: z.infer<typeof examRowSchema>,
  subjects: readonly (ExamSubjectView | ExamSubjectRow)[],
): StoredExam {
  if (!isExamType(row.exam_type) || !isNetRuleVersion(row.rule_version)) {
    throw new ExamStoreError("read_exam_type");
  }
  return {
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    takenOn: row.taken_on,
    examType: row.exam_type,
    ruleVersion: row.rule_version,
    totalNet: asNumber(row.total_net),
    score: asOptionalNumber(row.score),
    requestId: row.request_id,
    subjects: subjects.map(toSubjectPayload),
  };
}

export async function listExams(
  client: SupabaseClient,
  studentId: string,
  window: DateWindow,
): Promise<ExamListItem[]> {
  const { data, error } = await client
    .from("exams")
    .select(
      "id, student_id, title, taken_on, exam_type, rule_version, total_net, score, request_id",
    )
    .eq("student_id", studentId)
    .gte("taken_on", window.from)
    .lte("taken_on", window.to)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) fail("list_exams", error);
  return (data ?? []).map((row) => toListItem(examRowSchema.parse(row)));
}

async function loadSubjectsForExams(
  client: SupabaseClient,
  examIds: readonly string[],
): Promise<Map<string, ExamSubjectView[]>> {
  const byExam = new Map<string, ExamSubjectView[]>();
  for (const id of examIds) byExam.set(id, []);
  if (examIds.length === 0) return byExam;

  const subjectWithExam = subjectRowSchema.extend({ exam_id: z.uuid() });
  const { data, error } = await client
    .from("exam_subject_results")
    .select(
      "id, exam_id, subject_id, question_count, correct_count, wrong_count, blank_count, net, subjects(name, code)",
    )
    .in("exam_id", [...examIds])
    .order("created_at", { ascending: true })
    .limit(PAGE_SIZE);
  if (error) fail("list_exam_subjects_batch", error);
  for (const raw of data ?? []) {
    const row = subjectWithExam.parse(raw);
    const list = byExam.get(row.exam_id) ?? [];
    list.push(toSubjectRow(row));
    byExam.set(row.exam_id, list);
  }
  return byExam;
}

/** List exams in a date window together with their subject nets. */
export async function listExamsWithSubjects(
  client: SupabaseClient,
  studentId: string,
  window: DateWindow,
): Promise<ExamDetail[]> {
  const { data, error } = await client
    .from("exams")
    .select(
      "id, student_id, title, taken_on, exam_type, rule_version, total_net, score, request_id",
    )
    .eq("student_id", studentId)
    .gte("taken_on", window.from)
    .lte("taken_on", window.to)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) fail("list_exams_with_subjects", error);
  const exams = (data ?? []).map((row) => examRowSchema.parse(row));
  const subjectsByExam = await loadSubjectsForExams(
    client,
    exams.map((exam) => exam.id),
  );
  return exams.map((exam) => {
    const list = toListItem(exam);
    return {
      ...list,
      studentId: exam.student_id,
      requestId: exam.request_id,
      subjects: subjectsByExam.get(exam.id) ?? [],
    };
  });
}

export async function getExam(
  client: SupabaseClient,
  studentId: string,
  examId: string,
): Promise<ExamDetail | null> {
  const { data, error } = await client
    .from("exams")
    .select(
      "id, student_id, title, taken_on, exam_type, rule_version, total_net, score, request_id",
    )
    .eq("student_id", studentId)
    .eq("id", examId)
    .maybeSingle();
  if (error) fail("get_exam", error);
  if (!data) return null;
  const exam = examRowSchema.parse(data);
  const subjects = await loadSubjects(client, exam.id);
  const list = toListItem(exam);
  return {
    ...list,
    studentId: exam.student_id,
    requestId: exam.request_id,
    subjects,
  };
}

export async function findExamByRequestId(
  client: SupabaseClient,
  studentId: string,
  requestId: string,
): Promise<StoredExam | null> {
  const { data, error } = await client
    .from("exams")
    .select(
      "id, student_id, title, taken_on, exam_type, rule_version, total_net, score, request_id",
    )
    .eq("student_id", studentId)
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) fail("find_exam_by_request", error);
  if (!data) return null;
  const exam = examRowSchema.parse(data);
  const subjects = await loadSubjects(client, exam.id);
  return toStored(exam, subjects);
}

async function insertSubjectRows(
  client: SupabaseClient,
  examId: string,
  subjects: readonly ExamSubjectRow[],
): Promise<void> {
  const { error } = await client.from("exam_subject_results").insert(
    subjects.map((subject) => ({
      exam_id: examId,
      subject_id: subject.subjectId,
      question_count: subject.questionCount,
      correct_count: subject.correctCount,
      wrong_count: subject.wrongCount,
      blank_count: subject.blankCount,
      net: subject.net,
    })),
  );
  if (error) fail("insert_exam_subjects", error);
}

export async function insertExam(
  client: SupabaseClient,
  payload: ExamPayload,
): Promise<StoredExam> {
  const { data, error } = await client
    .from("exams")
    .insert({
      student_id: payload.studentId,
      title: payload.title,
      taken_on: payload.takenOn,
      exam_type: payload.examType,
      rule_version: payload.ruleVersion,
      total_net: payload.totalNet,
      score: payload.score,
      request_id: payload.requestId,
    })
    .select(
      "id, student_id, title, taken_on, exam_type, rule_version, total_net, score, request_id",
    )
    .single();
  if (error || !data) fail("insert_exam", error);
  const exam = examRowSchema.parse(data);
  try {
    await insertSubjectRows(client, exam.id, payload.subjects);
  } catch (subjectError) {
    await client.from("exams").delete().eq("id", exam.id);
    throw subjectError;
  }
  return toStored(exam, payload.subjects);
}

/**
 * Updates subject rows in place by subject_id so exam_mistakes stay attached.
 * Subjects removed from the exam are deleted (their mistakes cascade). After a
 * wrong/blank count drop, excess mistake rows for that result are pruned.
 */
export async function updateExam(
  client: SupabaseClient,
  studentId: string,
  examId: string,
  payload: Omit<ExamPayload, "studentId" | "requestId">,
): Promise<ExamDetail> {
  const { data, error } = await client
    .from("exams")
    .update({
      title: payload.title,
      taken_on: payload.takenOn,
      exam_type: payload.examType,
      rule_version: payload.ruleVersion,
      total_net: payload.totalNet,
      score: payload.score,
    })
    .eq("id", examId)
    .eq("student_id", studentId)
    .select(
      "id, student_id, title, taken_on, exam_type, rule_version, total_net, score, request_id",
    )
    .maybeSingle();
  if (error) fail("update_exam", error);
  if (!data) throw new ExamStoreError("update_exam_missing");

  const existing = await loadSubjects(client, examId);
  const bySubject = new Map(existing.map((row) => [row.subjectId, row]));
  const keptIds = new Set<string>();

  for (const subject of payload.subjects) {
    const previous = bySubject.get(subject.subjectId);
    if (previous) {
      const { error: updateError } = await client
        .from("exam_subject_results")
        .update({
          question_count: subject.questionCount,
          correct_count: subject.correctCount,
          wrong_count: subject.wrongCount,
          blank_count: subject.blankCount,
          net: subject.net,
        })
        .eq("id", previous.resultId)
        .eq("exam_id", examId);
      if (updateError) fail("update_exam_subject", updateError);
      keptIds.add(previous.resultId);
      await pruneExcessMistakes(
        client,
        previous.resultId,
        subject.wrongCount,
        subject.blankCount,
      );
    } else {
      const { data: inserted, error: insertError } = await client
        .from("exam_subject_results")
        .insert({
          exam_id: examId,
          subject_id: subject.subjectId,
          question_count: subject.questionCount,
          correct_count: subject.correctCount,
          wrong_count: subject.wrongCount,
          blank_count: subject.blankCount,
          net: subject.net,
        })
        .select("id")
        .single();
      if (insertError || !inserted) fail("insert_exam_subject", insertError);
      keptIds.add(z.object({ id: z.uuid() }).parse(inserted).id);
    }
  }

  const removed = existing.filter((row) => !keptIds.has(row.resultId));
  if (removed.length > 0) {
    const { error: deleteError } = await client
      .from("exam_subject_results")
      .delete()
      .in(
        "id",
        removed.map((row) => row.resultId),
      );
    if (deleteError) fail("delete_exam_subjects", deleteError);
  }

  const exam = examRowSchema.parse(data);
  const subjects = await loadSubjects(client, exam.id);
  const list = toListItem(exam);
  return {
    ...list,
    studentId: exam.student_id,
    requestId: exam.request_id,
    subjects,
  };
}

async function pruneExcessMistakes(
  client: SupabaseClient,
  resultId: string,
  wrongLimit: number,
  blankLimit: number,
): Promise<void> {
  for (const [kind, limit] of [
    ["wrong", wrongLimit],
    ["blank", blankLimit],
  ] as const) {
    const { data, error } = await client
      .from("exam_mistakes")
      .select("id")
      .eq("exam_subject_result_id", resultId)
      .eq("mistake_kind", kind)
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) fail("list_mistakes_for_prune", error);
    const rows = data ?? [];
    if (rows.length <= limit) continue;
    const excess = rows
      .slice(limit)
      .map((row) => z.object({ id: z.uuid() }).parse(row).id);
    const { error: deleteError } = await client
      .from("exam_mistakes")
      .delete()
      .in("id", excess);
    if (deleteError) fail("prune_mistakes", deleteError);
  }
}

export async function deleteExam(
  client: SupabaseClient,
  studentId: string,
  examId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("exams")
    .delete()
    .eq("id", examId)
    .eq("student_id", studentId)
    .select("id")
    .maybeSingle();
  if (error) fail("delete_exam", error);
  return Boolean(data);
}

export async function listSubjectIdByCode(
  client: SupabaseClient,
): Promise<Map<string, string>> {
  const { data, error } = await client
    .from("subjects")
    .select("id, code")
    .is("archived_at", null)
    .limit(PAGE_SIZE);
  if (error) fail("list_subjects", error);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const parsed = z.object({ id: z.uuid(), code: z.string() }).parse(row);
    map.set(parsed.code, parsed.id);
  }
  return map;
}
