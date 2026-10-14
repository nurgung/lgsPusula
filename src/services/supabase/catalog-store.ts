import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  outcomeRowSchema,
  subjectRowSchema,
  topicRowSchema,
  type CatalogEntity,
  type OutcomeCreateInput,
  type OutcomeRow,
  type OutcomeUpdateInput,
  type SubjectCreateInput,
  type SubjectRow,
  type SubjectUpdateInput,
  type TopicCreateInput,
  type TopicRow,
  type TopicUpdateInput,
} from "@/features/curriculum/schemas";
import type { CatalogWriteResult } from "@/features/curriculum/catalog-change";

export class CatalogStoreError extends Error {
  constructor(operation: string, code?: string) {
    // Operation and error code only; provider messages may echo user input.
    super(`Catalog operation failed: ${operation}${code ? ` (${code})` : ""}`);
    this.name = "CatalogStoreError";
  }
}

const TABLES: Record<CatalogEntity, string> = {
  subject: "subjects",
  topic: "topics",
  learning_outcome: "learning_outcomes",
};

const SELECT_COMMON =
  "id, sort_order, source_name, source_version, created_at, archived_at";

/** PostgREST returns at most `max_rows` (1000) rows per request; read page by page. */
const PAGE_SIZE = 1000;

async function readAll<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
  schema: z.ZodType<T>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new CatalogStoreError(`read_${table}`, error.code);
    const page = z.array(schema).parse(data ?? []);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Reads the whole catalog. With a session client the rows come back under RLS. */
export async function fetchCatalogRows(client: SupabaseClient): Promise<{
  subjects: SubjectRow[];
  topics: TopicRow[];
  outcomes: OutcomeRow[];
}> {
  const [subjects, topics, outcomes] = await Promise.all([
    readAll(client, "subjects", `${SELECT_COMMON}, code, name`, subjectRowSchema),
    readAll(client, "topics", `${SELECT_COMMON}, subject_id, name`, topicRowSchema),
    readAll(
      client,
      "learning_outcomes",
      `${SELECT_COMMON}, topic_id, code, description`,
      outcomeRowSchema,
    ),
  ]);
  return { subjects, topics, outcomes };
}

/** Maps the expected refusals to results; anything else is an infrastructure error. */
function classify(error: PostgrestError, operation: string): CatalogWriteResult {
  // 23505 unique_violation, 42501 insufficient_privilege / RLS, 23503 missing parent row.
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501") return "denied";
  if (error.code === "23503") return "not_found";
  throw new CatalogStoreError(operation, error.code);
}

async function insertRow(
  session: SupabaseClient,
  entity: CatalogEntity,
  values: Record<string, unknown>,
): Promise<CatalogWriteResult> {
  const { error } = await session.from(TABLES[entity]).insert(values);
  return error ? classify(error, `insert_${entity}`) : "ok";
}

async function updateRow(
  session: SupabaseClient,
  entity: CatalogEntity,
  id: string,
  values: Record<string, unknown>,
): Promise<CatalogWriteResult> {
  const { data, error } = await session
    .from(TABLES[entity])
    .update(values)
    .eq("id", id)
    .select("id");
  if (error) return classify(error, `update_${entity}`);
  // RLS hides rows the caller may not update: report the same as a missing row.
  return (data ?? []).length === 1 ? "ok" : "not_found";
}

const sourceColumns = (input: { sourceName: string; sourceVersion: string }) => ({
  source_name: input.sourceName,
  source_version: input.sourceVersion,
});

export const insertSubject = (session: SupabaseClient, input: SubjectCreateInput) =>
  insertRow(session, "subject", {
    code: input.code,
    name: input.name,
    sort_order: input.sortOrder,
    ...sourceColumns(input),
  });

export const updateSubject = (session: SupabaseClient, input: SubjectUpdateInput) =>
  updateRow(session, "subject", input.id, {
    name: input.name,
    sort_order: input.sortOrder,
    ...sourceColumns(input),
  });

export const insertTopic = (session: SupabaseClient, input: TopicCreateInput) =>
  insertRow(session, "topic", {
    subject_id: input.subjectId,
    name: input.name,
    sort_order: input.sortOrder,
    ...sourceColumns(input),
  });

export const updateTopic = (session: SupabaseClient, input: TopicUpdateInput) =>
  updateRow(session, "topic", input.id, {
    name: input.name,
    sort_order: input.sortOrder,
    ...sourceColumns(input),
  });

export const insertOutcome = (session: SupabaseClient, input: OutcomeCreateInput) =>
  insertRow(session, "learning_outcome", {
    topic_id: input.topicId,
    code: input.code,
    description: input.description,
    sort_order: input.sortOrder,
    ...sourceColumns(input),
  });

export const updateOutcome = (session: SupabaseClient, input: OutcomeUpdateInput) =>
  updateRow(session, "learning_outcome", input.id, {
    code: input.code,
    description: input.description,
    sort_order: input.sortOrder,
    ...sourceColumns(input),
  });

export const setArchived = (
  session: SupabaseClient,
  entity: CatalogEntity,
  id: string,
  archived: boolean,
) =>
  updateRow(session, entity, id, {
    archived_at: archived ? new Date().toISOString() : null,
  });
