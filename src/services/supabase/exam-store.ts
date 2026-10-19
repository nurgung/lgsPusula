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
  request_id: z.uuid(),
});

const subjectRowSchema = z.object({
  subject_id: z.uuid(),
  question_count: z.number().int(),
  correct_count: z.number().int(),
  wrong_count: z.number().int(),
  blank_count: z.number().int(),
  net: z.union([z.number(), z.string()]),
  subjects: embeddedSubject,
});

export type ExamSubjectView = ExamSubjectRow & {
  subjectName: string;
};

export type ExamListItem = {
  id: string;
  title: string;
  takenOn: string;
  examType: ExamType;
  ruleVersion: NetRuleVersion;
  totalNet: number;
};

export type ExamDetail = ExamListItem & {
  studentId: string;
  requestId: string;
  subjects: ExamSubjectView[];
};

function fail(operation: string, error: PostgrestError | null): never {
  throw new ExamStoreError(operation, error?.code);
}

function toSubjectRow(
  row: z.infer<typeof subjectRowSchema>,
): ExamSubjectView {
  const subject = firstSubject(row.subjects);
  if (!subject) throw new ExamStoreError("read_exam_subject");
  return {
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
      "subject_id, question_count, correct_count, wrong_count, blank_count, net, subjects(name, code)",
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
    .select("id, student_id, title, taken_on, exam_type, rule_version, total_net, request_id")
    .eq("student_id", studentId)
    .gte("taken_on", window.from)
    .lte("taken_on", window.to)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) fail("list_exams", error);
  return (data ?? []).map((row) => toListItem(examRowSchema.parse(row)));
}

export async function getExam(
  client: SupabaseClient,
  studentId: string,
  examId: string,
): Promise<ExamDetail | null> {
  const { data, error } = await client
    .from("exams")
    .select("id, student_id, title, taken_on, exam_type, rule_version, total_net, request_id")
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
    .select("id, student_id, title, taken_on, exam_type, rule_version, total_net, request_id")
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
      request_id: payload.requestId,
    })
    .select("id, student_id, title, taken_on, exam_type, rule_version, total_net, request_id")
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
    })
    .eq("id", examId)
    .eq("student_id", studentId)
    .select("id, student_id, title, taken_on, exam_type, rule_version, total_net, request_id")
    .maybeSingle();
  if (error) fail("update_exam", error);
  if (!data) throw new ExamStoreError("update_exam_missing");

  const { error: deleteError } = await client
    .from("exam_subject_results")
    .delete()
    .eq("exam_id", examId);
  if (deleteError) fail("replace_exam_subjects_delete", deleteError);
  await insertSubjectRows(client, examId, payload.subjects);

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
