import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTH_EMAIL_DOMAIN } from "../../../src/features/auth/username.ts";
import { admin } from "./auth.ts";
import {
  E2E_SOURCE_NAME,
  E2E_SOURCE_VERSION,
  E2E_SUBJECT_PREFIX,
  matchesE2eAccountEmail,
  matchesE2eCatalogSubject,
  type E2eCatalogSignature,
} from "./catalog-signature.ts";

export { E2E_SOURCE_NAME, E2E_SOURCE_VERSION, E2E_SUBJECT_PREFIX };

export type SeededCatalog = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  outcomeId: string;
  topicName: string;
  outcomeCode: string;
};

export type E2eCatalogCleanupResult = {
  subjects: number;
  topics: number;
  outcomes: number;
  studyLogs: number;
  studyGoals: number;
  exams: number;
  examSubjectResults: number;
  examMistakes: number;
  practiceCompletions: number;
};

type CleanupScope = {
  subjectIds: readonly string[];
  subjectCodes: readonly string[];
};

const trackedSubjectIds = new Set<string>();
const trackedSubjectCodes = new Set<string>();

const SIGNATURE_COLUMNS = "id, code, source_name, source_version";
const ROW_LIMIT = 1000;

const EMPTY_CLEANUP: E2eCatalogCleanupResult = {
  subjects: 0,
  topics: 0,
  outcomes: 0,
  studyLogs: 0,
  studyGoals: 0,
  exams: 0,
  examSubjectResults: 0,
  examMistakes: 0,
  practiceCompletions: 0,
};

type SubjectRow = E2eCatalogSignature & { id: string };

function cleanupError(action: string, code?: string): Error {
  return new Error(
    `E2E catalog cleanup failed while ${action}${code ? ` (${code})` : ""}.`,
  );
}

function refuse(reason: string): Error {
  return new Error(`E2E catalog cleanup refused: ${reason} Nothing was deleted.`);
}

/** Remembers a fictional subject code created through the admin UI or API. */
export function trackE2eSubjectCode(code: string) {
  trackedSubjectCodes.add(code);
}

/** Fictional catalog rows, unique per test, written with the service role. */
export async function seedCatalog(): Promise<SeededCatalog> {
  const tag = randomBytes(4).toString("hex");
  const source = { source_name: E2E_SOURCE_NAME, source_version: E2E_SOURCE_VERSION };
  const subjectName = `E2E Ders ${tag}`;
  const code = `${E2E_SUBJECT_PREFIX}${tag}`;
  const { data: subject, error: subjectError } = await admin()
    .from("subjects")
    .insert({ code, name: subjectName, ...source })
    .select("id")
    .single<{ id: string }>();
  if (subjectError || !subject)
    throw new Error(`seed subject failed (${subjectError?.code})`);
  trackedSubjectIds.add(subject.id);

  const topicName = `E2E Konu ${tag}`;
  const { data: topic, error: topicError } = await admin()
    .from("topics")
    .insert({ subject_id: subject.id, name: topicName, ...source })
    .select("id")
    .single<{ id: string }>();
  if (topicError || !topic) throw new Error(`seed topic failed (${topicError?.code})`);

  const outcomeCode = `E2E.${tag}.1`;
  const { data: outcome, error: outcomeError } = await admin()
    .from("learning_outcomes")
    .insert({
      topic_id: topic.id,
      code: outcomeCode,
      description: "Kurgusal test kazanımı",
      ...source,
    })
    .select("id")
    .single<{ id: string }>();
  if (outcomeError || !outcome)
    throw new Error(`seed outcome failed (${outcomeError?.code})`);

  return {
    subjectId: subject.id,
    subjectName,
    topicId: topic.id,
    outcomeId: outcome.id,
    topicName,
    outcomeCode,
  };
}

/** Deletes fictional rows created by the current test. Safe to call when the test seeded nothing. */
export async function releaseTrackedE2eCatalog(): Promise<E2eCatalogCleanupResult> {
  if (trackedSubjectIds.size === 0 && trackedSubjectCodes.size === 0) return EMPTY_CLEANUP;
  const result = await deleteE2eCatalog({
    subjectIds: [...trackedSubjectIds],
    subjectCodes: [...trackedSubjectCodes],
  });
  trackedSubjectIds.clear();
  trackedSubjectCodes.clear();
  return result;
}

/**
 * Removes fictional catalog rows and the test-account rows that reference them.
 * Without a scope, every subject matching the fictional signature is removed.
 * A scoped call deletes nothing when a requested row fails that signature.
 */
export async function deleteE2eCatalog(
  scope?: CleanupScope,
): Promise<E2eCatalogCleanupResult> {
  const client = admin();
  const subjects = await readSubjects(client, scope);
  if (subjects.length === 0) return EMPTY_CLEANUP;
  const subjectIds = subjects.map((row) => row.id);

  const topicIds = await readChildIds(client, "topics", "subject_id", subjectIds);
  const outcomeIds = await readChildIds(client, "learning_outcomes", "topic_id", topicIds);
  const studyLogs = await readOwnedIds(client, "study_logs", subjectIds);
  const studyGoals = await readOwnedIds(client, "study_goals", subjectIds);
  const examResultRows = await readExamResults(client, subjectIds);
  const examIds = [...new Set(examResultRows.map((row) => row.exam_id))];
  const examRows = examIds.length === 0 ? [] : await readExams(client, examIds);
  if (examRows.length !== examIds.length) {
    throw refuse("an exam linked to the fictional catalog could not be read.");
  }
  const foreignResult = examRows.some((exam) =>
    exam.results.some((result) => !subjectIds.includes(result.subject_id)),
  );
  if (foreignResult) {
    throw refuse("an exam mixes the fictional catalog with another subject.");
  }
  const mistakeIds = await readMistakeIds(client, outcomeIds, examResultRows);
  const practiceRows =
    outcomeIds.length === 0 ? [] : await readPractice(client, outcomeIds);

  const studentIds = uniqueIds([
    ...studyLogs.studentIds,
    ...studyGoals.studentIds,
    ...examRows.map((row) => row.student_id),
    ...practiceRows.map((row) => row.student_id),
  ]);
  await assertE2eAccounts(client, studentIds);

  await deleteIds(client, "coaching_practice_completions", practiceRows.map((row) => row.id));
  await deleteIds(client, "exam_mistakes", mistakeIds);
  await deleteIds(client, "study_logs", studyLogs.ids);
  await deleteIds(client, "study_goals", studyGoals.ids);
  await deleteIds(
    client,
    "exam_subject_results",
    examRows.flatMap((exam) => exam.results.map((result) => result.id)),
  );
  await deleteIds(
    client,
    "exams",
    examRows.map((row) => row.id),
  );
  await deleteIds(client, "learning_outcomes", outcomeIds);
  await deleteIds(client, "topics", topicIds);
  await deleteIds(client, "subjects", subjectIds);

  return {
    subjects: subjectIds.length,
    topics: topicIds.length,
    outcomes: outcomeIds.length,
    studyLogs: studyLogs.ids.length,
    studyGoals: studyGoals.ids.length,
    exams: examRows.length,
    examSubjectResults: examRows.reduce((sum, exam) => sum + exam.results.length, 0),
    examMistakes: mistakeIds.length,
    practiceCompletions: practiceRows.length,
  };
}

async function readSubjects(
  client: SupabaseClient,
  scope: CleanupScope | undefined,
): Promise<SubjectRow[]> {
  if (!scope) {
    const { data, error } = await client
      .from("subjects")
      .select(SIGNATURE_COLUMNS)
      .like("code", `${E2E_SUBJECT_PREFIX}%`)
      .eq("source_name", E2E_SOURCE_NAME)
      .eq("source_version", E2E_SOURCE_VERSION)
      .limit(ROW_LIMIT);
    if (error) throw cleanupError("reading fictional subjects", error.code);
    const rows = asRows(data);
    if (rows.length >= ROW_LIMIT) {
      throw cleanupError("reading fictional subjects", "too_many_rows");
    }
    if (rows.some((row) => !matchesE2eCatalogSubject(row))) {
      throw refuse("a selected subject failed the fictional signature check.");
    }
    return rows;
  }

  const rows = [
    ...(await readScopedSubjects(client, "id", scope.subjectIds)),
    ...(await readScopedSubjects(client, "code", scope.subjectCodes)),
  ];
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  const mismatched = unique.filter((row) => !matchesE2eCatalogSubject(row));
  if (mismatched.length > 0) {
    throw refuse(
      `${mismatched.length} requested subject(s) do not match the fictional signature.`,
    );
  }
  return unique;
}

async function readScopedSubjects(
  client: SupabaseClient,
  column: "id" | "code",
  values: readonly string[],
): Promise<SubjectRow[]> {
  if (values.length === 0) return [];
  const { data, error } = await client
    .from("subjects")
    .select(SIGNATURE_COLUMNS)
    .in(column, [...values])
    .limit(ROW_LIMIT);
  if (error) throw cleanupError("reading requested subjects", error.code);
  const rows = asRows(data);
  if (rows.length >= ROW_LIMIT) {
    throw cleanupError("reading requested subjects", "too_many_rows");
  }
  return rows;
}

function asRows(data: unknown): SubjectRow[] {
  if (!Array.isArray(data)) throw cleanupError("reading subjects", "unreadable");
  return data.map((item) => {
    if (!item || typeof item !== "object") throw cleanupError("reading subjects", "unreadable");
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.code !== "string" ||
      typeof row.source_name !== "string" ||
      typeof row.source_version !== "string"
    ) {
      throw cleanupError("reading subjects", "missing_signature");
    }
    return {
      id: row.id,
      code: row.code,
      source_name: row.source_name,
      source_version: row.source_version,
    };
  });
}

async function readChildIds(
  client: SupabaseClient,
  table: "topics" | "learning_outcomes",
  filterColumn: "subject_id" | "topic_id",
  filterIds: readonly string[],
): Promise<string[]> {
  if (filterIds.length === 0) return [];
  const { data, error } = await client
    .from(table)
    .select("id")
    .in(filterColumn, [...filterIds])
    .limit(ROW_LIMIT);
  if (error) throw cleanupError(`reading ${table}`, error.code);
  if (!Array.isArray(data)) throw cleanupError(`reading ${table}`, "unreadable");
  if (data.length >= ROW_LIMIT) throw cleanupError(`reading ${table}`, "too_many_rows");
  return data.map((row) => readString(row, "id", table));
}

async function readOwnedIds(
  client: SupabaseClient,
  table: "study_logs" | "study_goals",
  subjectIds: readonly string[],
): Promise<{ ids: string[]; studentIds: string[] }> {
  if (subjectIds.length === 0) return { ids: [], studentIds: [] };
  const { data, error } = await client
    .from(table)
    .select("id, student_id")
    .in("subject_id", [...subjectIds])
    .limit(ROW_LIMIT);
  if (error) throw cleanupError(`reading ${table}`, error.code);
  if (!Array.isArray(data)) throw cleanupError(`reading ${table}`, "unreadable");
  if (data.length >= ROW_LIMIT) throw cleanupError(`reading ${table}`, "too_many_rows");
  return {
    ids: data.map((row) => readString(row, "id", table)),
    studentIds: data.map((row) => readString(row, "student_id", table)),
  };
}

async function readExamResults(
  client: SupabaseClient,
  subjectIds: readonly string[],
): Promise<{ id: string; exam_id: string }[]> {
  const { data, error } = await client
    .from("exam_subject_results")
    .select("id, exam_id, subject_id")
    .in("subject_id", [...subjectIds])
    .limit(ROW_LIMIT);
  if (error) throw cleanupError("reading exam subject results", error.code);
  if (!Array.isArray(data)) throw cleanupError("reading exam subject results", "unreadable");
  if (data.length >= ROW_LIMIT) {
    throw cleanupError("reading exam subject results", "too_many_rows");
  }
  return data.map((row) => ({
    id: readString(row, "id", "exam_subject_results"),
    exam_id: readString(row, "exam_id", "exam_subject_results"),
  }));
}

async function readExams(
  client: SupabaseClient,
  examIds: readonly string[],
): Promise<
  { id: string; student_id: string; results: { id: string; subject_id: string }[] }[]
> {
  const { data: exams, error } = await client
    .from("exams")
    .select("id, student_id")
    .in("id", [...examIds])
    .limit(ROW_LIMIT);
  if (error) throw cleanupError("reading exams", error.code);
  if (!Array.isArray(exams)) throw cleanupError("reading exams", "unreadable");
  const { data: results, error: resultError } = await client
    .from("exam_subject_results")
    .select("id, exam_id, subject_id")
    .in("exam_id", [...examIds])
    .limit(ROW_LIMIT);
  if (resultError) throw cleanupError("reading exam subject results", resultError.code);
  if (!Array.isArray(results)) throw cleanupError("reading exam subject results", "unreadable");
  if (results.length >= ROW_LIMIT) {
    throw cleanupError("reading exam subject results", "too_many_rows");
  }
  return exams.map((exam) => {
    const id = readString(exam, "id", "exams");
    return {
      id,
      student_id: readString(exam, "student_id", "exams"),
      results: results
        .filter((result) => readString(result, "exam_id", "exam_subject_results") === id)
        .map((result) => ({
          id: readString(result, "id", "exam_subject_results"),
          subject_id: readString(result, "subject_id", "exam_subject_results"),
        })),
    };
  });
}

async function readMistakeIds(
  client: SupabaseClient,
  outcomeIds: readonly string[],
  examResults: readonly { id: string }[],
): Promise<string[]> {
  if (outcomeIds.length === 0) return [];
  const { data, error } = await client
    .from("exam_mistakes")
    .select("id, exam_subject_result_id")
    .in("learning_outcome_id", [...outcomeIds])
    .limit(ROW_LIMIT);
  if (error) throw cleanupError("reading exam mistakes", error.code);
  if (!Array.isArray(data)) throw cleanupError("reading exam mistakes", "unreadable");
  if (data.length >= ROW_LIMIT) throw cleanupError("reading exam mistakes", "too_many_rows");
  const allowed = new Set(examResults.map((row) => row.id));
  return data.map((row) => {
    const resultId = readString(row, "exam_subject_result_id", "exam_mistakes");
    if (!allowed.has(resultId)) {
      throw refuse("an exam mistake links a fictional outcome to another subject result.");
    }
    return readString(row, "id", "exam_mistakes");
  });
}

async function readPractice(
  client: SupabaseClient,
  outcomeIds: readonly string[],
): Promise<{ id: string; student_id: string }[]> {
  const { data, error } = await client
    .from("coaching_practice_completions")
    .select("id, student_id")
    .in("learning_outcome_id", [...outcomeIds])
    .limit(ROW_LIMIT);
  if (error) throw cleanupError("reading coaching practice completions", error.code);
  if (!Array.isArray(data)) {
    throw cleanupError("reading coaching practice completions", "unreadable");
  }
  if (data.length >= ROW_LIMIT) {
    throw cleanupError("reading coaching practice completions", "too_many_rows");
  }
  return data.map((row) => ({
    id: readString(row, "id", "coaching_practice_completions"),
    student_id: readString(row, "student_id", "coaching_practice_completions"),
  }));
}

async function assertE2eAccounts(client: SupabaseClient, studentIds: readonly string[]) {
  for (const studentId of studentIds) {
    const { data, error } = await client.auth.admin.getUserById(studentId);
    if (error || !data.user) {
      throw cleanupError("verifying the account that owns fictional catalog data", error?.code);
    }
    if (!matchesE2eAccountEmail(data.user.email, AUTH_EMAIL_DOMAIN)) {
      throw refuse("a non-test account references this fictional catalog.");
    }
  }
}

async function deleteIds(client: SupabaseClient, table: string, ids: readonly string[]) {
  if (ids.length === 0) return;
  const { error } = await client.from(table).delete().in("id", [...ids]);
  if (error) {
    throw new Error(
      `E2E catalog cleanup failed while deleting ${table} (${error.code}). Fictional rows earlier in this cleanup may already have been removed. Real subjects were not targeted.`,
    );
  }
}

function readString(row: unknown, key: string, table: string): string {
  if (!row || typeof row !== "object" || !(key in row)) {
    throw cleanupError(`reading ${table}`, "missing_field");
  }
  const value = (row as Record<string, unknown>)[key];
  if (typeof value !== "string" || value.length === 0) {
    throw cleanupError(`reading ${table}`, "missing_field");
  }
  return value;
}

function uniqueIds(ids: readonly string[]) {
  return [...new Set(ids)];
}
