import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { CatalogSelection } from "@/features/curriculum/catalog";
import type { StudyLogPayload, StoredStudyLog } from "@/features/study/commit-log";
import type { PlacementFacts } from "@/features/study/placement";
import type { DateWindow } from "@/features/study/calendar";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";

export class StudyStoreError extends Error {
  constructor(operation: string, code?: string) {
    super(`Study operation failed: ${operation}${code ? ` (${code})` : ""}`);
    this.name = "StudyStoreError";
  }
}

const PAGE_SIZE = 1000;

const embeddedName = z
  .union([z.object({ name: z.string() }), z.array(z.object({ name: z.string() }))])
  .nullable();

const embeddedCode = z
  .union([z.object({ code: z.string() }), z.array(z.object({ code: z.string() }))])
  .nullable();

function firstName(value: z.infer<typeof embeddedName>): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? null;
}

function firstCode(value: z.infer<typeof embeddedCode>): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row?.code ?? null;
}

const logRowSchema = z.object({
  id: z.uuid(),
  studied_on: z.string(),
  subject_id: z.uuid(),
  topic_id: z.uuid().nullable(),
  learning_outcome_id: z.uuid().nullable(),
  question_count: z.number().int(),
  correct_count: z.number().int(),
  wrong_count: z.number().int(),
  blank_count: z.number().int(),
  duration_minutes: z.number().int(),
  subjects: embeddedName,
  topics: embeddedName,
  learning_outcomes: embeddedCode,
});

const storedRowSchema = z.object({
  id: z.uuid(),
  student_id: z.uuid(),
  studied_on: z.string(),
  subject_id: z.uuid(),
  topic_id: z.uuid().nullable(),
  learning_outcome_id: z.uuid().nullable(),
  question_count: z.number().int(),
  correct_count: z.number().int(),
  wrong_count: z.number().int(),
  blank_count: z.number().int(),
  duration_minutes: z.number().int(),
  request_id: z.uuid(),
});

const goalRowSchema = z.object({
  id: z.uuid(),
  period: z.enum(["day", "week"]),
  subject_id: z.uuid().nullable(),
  target_questions: z.number().int(),
  subjects: embeddedName,
});

const LOG_SELECT = `
  id, studied_on, subject_id, topic_id, learning_outcome_id,
  question_count, correct_count, wrong_count, blank_count, duration_minutes,
  subjects(name), topics(name), learning_outcomes(code)
`;

function toLogView(row: z.infer<typeof logRowSchema>): StudyLogView {
  const subjectName = firstName(row.subjects);
  if (!subjectName) throw new StudyStoreError("read_study_log_subject");
  return {
    id: row.id,
    studiedOn: row.studied_on,
    subjectId: row.subject_id,
    subjectName,
    topicId: row.topic_id,
    topicName: firstName(row.topics),
    outcomeId: row.learning_outcome_id,
    outcomeCode: firstCode(row.learning_outcomes),
    questionCount: row.question_count,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    blankCount: row.blank_count,
    durationMinutes: row.duration_minutes,
  };
}

function toStored(row: z.infer<typeof storedRowSchema>): StoredStudyLog {
  return {
    id: row.id,
    studentId: row.student_id,
    studiedOn: row.studied_on,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    outcomeId: row.learning_outcome_id,
    questionCount: row.question_count,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    blankCount: row.blank_count,
    durationMinutes: row.duration_minutes,
    requestId: row.request_id,
  };
}

function classifyInsert(error: PostgrestError): "exists" {
  if (error.code === "23505") return "exists";
  throw new StudyStoreError("insert_study_log", error.code);
}

export async function insertStudyLog(
  client: SupabaseClient,
  row: StudyLogPayload,
): Promise<{ status: "created"; id: string } | { status: "exists" }> {
  const { data, error } = await client
    .from("study_logs")
    .insert({
      student_id: row.studentId,
      studied_on: row.studiedOn,
      subject_id: row.subjectId,
      topic_id: row.topicId,
      learning_outcome_id: row.outcomeId,
      question_count: row.questionCount,
      correct_count: row.correctCount,
      wrong_count: row.wrongCount,
      blank_count: row.blankCount,
      duration_minutes: row.durationMinutes,
      request_id: row.requestId,
    })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) return { status: classifyInsert(error) };
  if (!data) throw new StudyStoreError("insert_study_log");
  return { status: "created", id: data.id };
}

export async function findStudyLogByRequestId(
  client: SupabaseClient,
  studentId: string,
  requestId: string,
): Promise<StoredStudyLog | null> {
  const { data, error } = await client
    .from("study_logs")
    .select(
      "id, student_id, studied_on, subject_id, topic_id, learning_outcome_id, question_count, correct_count, wrong_count, blank_count, duration_minutes, request_id",
    )
    .eq("student_id", studentId)
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw new StudyStoreError("find_study_log", error.code);
  return data ? toStored(storedRowSchema.parse(data)) : null;
}

export async function listStudyLogs(
  client: SupabaseClient,
  studentId: string,
  window: DateWindow,
): Promise<StudyLogView[]> {
  const rows: StudyLogView[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("study_logs")
      .select(LOG_SELECT)
      .eq("student_id", studentId)
      .gte("studied_on", window.from)
      .lte("studied_on", window.to)
      .order("studied_on", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new StudyStoreError("list_study_logs", error.code);
    const page = z
      .array(logRowSchema)
      .parse(data ?? [])
      .map(toLogView);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

const contributionRowSchema = z.object({
  studied_on: z.string(),
  question_count: z.number().int(),
});

/** Question totals by Istanbul day. The caller still filters by student id; RLS does too. */
export async function listStudyContributions(
  client: SupabaseClient,
  studentId: string,
  window: DateWindow,
): Promise<{ studiedOn: string; questionCount: number }[]> {
  const rows: { studiedOn: string; questionCount: number }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("study_logs")
      .select("studied_on, question_count")
      .eq("student_id", studentId)
      .gte("studied_on", window.from)
      .lte("studied_on", window.to)
      .order("studied_on", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new StudyStoreError("list_study_contributions", error.code);
    const page = z.array(contributionRowSchema).parse(data ?? []);
    rows.push(
      ...page.map((row) => ({
        studiedOn: row.studied_on,
        questionCount: row.question_count,
      })),
    );
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function getStudyLog(
  client: SupabaseClient,
  studentId: string,
  logId: string,
): Promise<StudyLogView | null> {
  const { data, error } = await client
    .from("study_logs")
    .select(LOG_SELECT)
    .eq("student_id", studentId)
    .eq("id", logId)
    .maybeSingle();
  if (error) throw new StudyStoreError("get_study_log", error.code);
  return data ? toLogView(logRowSchema.parse(data)) : null;
}

export async function updateStudyLog(
  client: SupabaseClient,
  logId: string,
  row: Omit<StudyLogPayload, "requestId">,
): Promise<"ok" | "not_found"> {
  const { data, error } = await client
    .from("study_logs")
    .update({
      studied_on: row.studiedOn,
      subject_id: row.subjectId,
      topic_id: row.topicId,
      learning_outcome_id: row.outcomeId,
      question_count: row.questionCount,
      correct_count: row.correctCount,
      wrong_count: row.wrongCount,
      blank_count: row.blankCount,
      duration_minutes: row.durationMinutes,
    })
    .eq("id", logId)
    .eq("student_id", row.studentId)
    .select("id");
  if (error) throw new StudyStoreError("update_study_log", error.code);
  return (data ?? []).length === 1 ? "ok" : "not_found";
}

export async function deleteStudyLog(
  client: SupabaseClient,
  studentId: string,
  logId: string,
): Promise<"ok" | "not_found"> {
  const { data, error } = await client
    .from("study_logs")
    .delete()
    .eq("id", logId)
    .eq("student_id", studentId)
    .select("id");
  if (error) throw new StudyStoreError("delete_study_log", error.code);
  return (data ?? []).length === 1 ? "ok" : "not_found";
}

export async function listStudyGoals(
  client: SupabaseClient,
  studentId: string,
): Promise<StudyGoalView[]> {
  const { data, error } = await client
    .from("study_goals")
    .select("id, period, subject_id, target_questions, subjects(name)")
    .eq("student_id", studentId);
  if (error) throw new StudyStoreError("list_study_goals", error.code);
  return z
    .array(goalRowSchema)
    .parse(data ?? [])
    .map((row) => ({
      id: row.id,
      period: row.period,
      subjectId: row.subject_id,
      subjectName: firstName(row.subjects),
      targetQuestions: row.target_questions,
    }));
}

export async function saveStudyGoal(
  client: SupabaseClient,
  input: {
    studentId: string;
    period: "day" | "week";
    subjectId: string | null;
    targetQuestions: number;
  },
): Promise<void> {
  const existingId = await findGoalId(client, input);
  if (existingId) {
    const { error } = await client
      .from("study_goals")
      .update({ target_questions: input.targetQuestions })
      .eq("id", existingId)
      .eq("student_id", input.studentId);
    if (error) throw new StudyStoreError("update_study_goal", error.code);
    return;
  }

  const { error } = await client.from("study_goals").insert({
    student_id: input.studentId,
    period: input.period,
    subject_id: input.subjectId,
    target_questions: input.targetQuestions,
  });
  if (!error) return;
  // A double click can insert twice before either sees the row. The loser updates it.
  if (error.code !== "23505") throw new StudyStoreError("insert_study_goal", error.code);
  const racedId = await findGoalId(client, input);
  if (!racedId) throw new StudyStoreError("insert_study_goal", error.code);
  const update = await client
    .from("study_goals")
    .update({ target_questions: input.targetQuestions })
    .eq("id", racedId)
    .eq("student_id", input.studentId);
  if (update.error) throw new StudyStoreError("update_study_goal", update.error.code);
}

async function findGoalId(
  client: SupabaseClient,
  input: { studentId: string; period: "day" | "week"; subjectId: string | null },
): Promise<string | null> {
  let query = client
    .from("study_goals")
    .select("id")
    .eq("student_id", input.studentId)
    .eq("period", input.period);
  query =
    input.subjectId === null
      ? query.is("subject_id", null)
      : query.eq("subject_id", input.subjectId);
  const { data, error } = await query.maybeSingle<{ id: string }>();
  if (error) throw new StudyStoreError("find_study_goal", error.code);
  return data?.id ?? null;
}

export async function deleteStudyGoal(
  client: SupabaseClient,
  studentId: string,
  goalId: string,
): Promise<"ok" | "not_found"> {
  const { data, error } = await client
    .from("study_goals")
    .delete()
    .eq("id", goalId)
    .eq("student_id", studentId)
    .select("id");
  if (error) throw new StudyStoreError("delete_study_goal", error.code);
  return (data ?? []).length === 1 ? "ok" : "not_found";
}

const subjectFactSchema = z.object({
  id: z.uuid(),
  archived_at: z.string().nullable(),
});

const topicFactSchema = z.object({
  id: z.uuid(),
  subject_id: z.uuid(),
  archived_at: z.string().nullable(),
});

const outcomeFactSchema = z.object({
  id: z.uuid(),
  topic_id: z.uuid(),
  archived_at: z.string().nullable(),
  topics: z.union([
    z.object({ subject_id: z.uuid(), archived_at: z.string().nullable() }),
    z.array(z.object({ subject_id: z.uuid(), archived_at: z.string().nullable() })),
  ]),
});

export async function readSubjectState(
  client: SupabaseClient,
  subjectId: string,
): Promise<"missing" | "active" | "archived"> {
  const { data, error } = await client
    .from("subjects")
    .select("id, archived_at")
    .eq("id", subjectId)
    .maybeSingle();
  if (error) throw new StudyStoreError("read_subject", error.code);
  if (!data) return "missing";
  const row = subjectFactSchema.parse(data);
  return row.archived_at === null ? "active" : "archived";
}

/** Loads the catalog rows the placement rule needs. Missing ids come back as null facts. */
export async function readPlacementFacts(
  client: SupabaseClient,
  subjectId: string,
  selection: CatalogSelection | null,
): Promise<PlacementFacts> {
  const subjectQuery = client
    .from("subjects")
    .select("id, archived_at")
    .eq("id", subjectId)
    .maybeSingle();

  const topicQuery =
    selection?.kind === "topic"
      ? client
          .from("topics")
          .select("id, subject_id, archived_at")
          .eq("id", selection.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

  const outcomeQuery =
    selection?.kind === "outcome"
      ? client
          .from("learning_outcomes")
          .select("id, topic_id, archived_at, topics(subject_id, archived_at)")
          .eq("id", selection.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

  const [subjectResult, topicResult, outcomeResult] = await Promise.all([
    subjectQuery,
    topicQuery,
    outcomeQuery,
  ]);
  if (subjectResult.error)
    throw new StudyStoreError("read_subject", subjectResult.error.code);
  if (topicResult.error) throw new StudyStoreError("read_topic", topicResult.error.code);
  if (outcomeResult.error) {
    throw new StudyStoreError("read_outcome", outcomeResult.error.code);
  }

  const subject = subjectResult.data ? subjectFactSchema.parse(subjectResult.data) : null;
  const topic = topicResult.data ? topicFactSchema.parse(topicResult.data) : null;
  const outcome = outcomeResult.data ? outcomeFactSchema.parse(outcomeResult.data) : null;
  const outcomeTopic = outcome
    ? Array.isArray(outcome.topics)
      ? outcome.topics[0]
      : outcome.topics
    : null;

  return {
    subject: subject ? { id: subject.id, archived: subject.archived_at !== null } : null,
    topic: topic
      ? {
          id: topic.id,
          subjectId: topic.subject_id,
          archived: topic.archived_at !== null,
        }
      : null,
    outcome:
      outcome && outcomeTopic
        ? {
            id: outcome.id,
            topicId: outcome.topic_id,
            subjectId: outcomeTopic.subject_id,
            archived: outcome.archived_at !== null,
            topicArchived: outcomeTopic.archived_at !== null,
          }
        : null,
  };
}
