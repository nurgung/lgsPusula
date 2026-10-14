// Catalog import shared by scripts/catalog.ts and its tests. Runs with the service_role key on
// the owner's computer only (decision 0.6: the owner enters and updates the catalog).
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  catalogFileSchema,
  type CatalogFile,
} from "../../src/features/curriculum/schemas.ts";

export const MAX_CATALOG_FILE_BYTES = 2 * 1024 * 1024;

export type ParseResult =
  { ok: true; file: CatalogFile } | { ok: false; errors: string[] };

/** Validates a JSON text against the shared schema; returns readable messages on failure. */
export function parseCatalogFile(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Dosya geçerli bir JSON değil."] };
  }
  const parsed = catalogFileSchema.safeParse(json);
  if (parsed.success) return { ok: true, file: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues
      .slice(0, 20)
      .map((issue) => `${issue.path.join(".") || "(dosya)"}: ${issue.message}`),
  };
}

export function isLocalSupabase(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost";
}

export type ExistingCatalog = {
  subjects: { id: string; code: string }[];
  topics: { id: string; subject_id: string; name: string; source_version: string }[];
  outcomes: { id: string; topic_id: string; code: string; source_version: string }[];
};

type Counts = { create: number; update: number };
export type ImportPlan = {
  subjects: Counts;
  topics: Counts;
  outcomes: Counts;
  /** Reasons the import must stop before writing anything. */
  conflicts: string[];
};

const topicKey = (subjectId: string, name: string, version: string) =>
  `${subjectId}\u0000${name}\u0000${version}`;
const outcomeKey = (code: string, version: string) => `${code}\u0000${version}`;

/**
 * Works out what an import would do without writing. Rows are matched by their natural keys:
 * subject code; topic (subject, name, source version); outcome (code, source version).
 * An outcome that already exists under a different topic is a conflict: moving it would change
 * the meaning of past records, so the import stops instead.
 */
export function planCatalogImport(
  file: CatalogFile,
  existing: ExistingCatalog,
): ImportPlan {
  const plan: ImportPlan = {
    subjects: { create: 0, update: 0 },
    topics: { create: 0, update: 0 },
    outcomes: { create: 0, update: 0 },
    conflicts: [],
  };
  const version = file.source.version;
  const subjectIds = new Map(existing.subjects.map((row) => [row.code, row.id]));
  const topicIds = new Map(
    existing.topics.map((row) => [
      topicKey(row.subject_id, row.name, row.source_version),
      row.id,
    ]),
  );
  const outcomes = new Map(
    existing.outcomes.map((row) => [outcomeKey(row.code, row.source_version), row]),
  );

  for (const subject of file.subjects) {
    const subjectId = subjectIds.get(subject.code);
    plan.subjects[subjectId ? "update" : "create"]++;
    for (const topic of subject.topics) {
      const topicId = subjectId
        ? topicIds.get(topicKey(subjectId, topic.name, version))
        : undefined;
      plan.topics[topicId ? "update" : "create"]++;
      for (const outcome of topic.outcomes) {
        const current = outcomes.get(outcomeKey(outcome.code, version));
        if (!current) {
          plan.outcomes.create++;
        } else if (current.topic_id === topicId) {
          plan.outcomes.update++;
        } else {
          plan.conflicts.push(
            `${outcome.code} (${version}) başka bir konuya kayıtlı; dosyada "${topic.name}" altında. Kazanım taşınmaz.`,
          );
        }
      }
    }
  }
  return plan;
}

const PAGE_SIZE = 1000;

async function readAll<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not read ${table} (${error.code}).`);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function readExistingCatalog(
  admin: SupabaseClient,
): Promise<ExistingCatalog> {
  const [subjects, topics, outcomes] = await Promise.all([
    readAll<ExistingCatalog["subjects"][number]>(admin, "subjects", "id, code"),
    readAll<ExistingCatalog["topics"][number]>(
      admin,
      "topics",
      "id, subject_id, name, source_version",
    ),
    readAll<ExistingCatalog["outcomes"][number]>(
      admin,
      "learning_outcomes",
      "id, topic_id, code, source_version",
    ),
  ]);
  return { subjects, topics, outcomes };
}

async function upsertReturningId(
  admin: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
  onConflict: string,
): Promise<string> {
  const { data, error } = await admin
    .from(table)
    .upsert(row, { onConflict })
    .select("id")
    .single<{ id: string }>();
  if (error || !data)
    throw new Error(`Could not write ${table} (${error?.code ?? "unknown"}).`);
  return data.id;
}

/**
 * Writes the file. Upserts by natural key, so running the same file twice changes nothing new.
 * Archive marks are never touched: an archived row stays archived. Each row is its own request,
 * so a network error can leave a partial import; running the file again completes it.
 */
export async function applyCatalogImport(
  admin: SupabaseClient,
  file: CatalogFile,
): Promise<ImportPlan> {
  const plan = planCatalogImport(file, await readExistingCatalog(admin));
  if (plan.conflicts.length > 0) return plan;

  const source = { source_name: file.source.name, source_version: file.source.version };
  for (const [subjectIndex, subject] of file.subjects.entries()) {
    const subjectId = await upsertReturningId(
      admin,
      "subjects",
      {
        code: subject.code,
        name: subject.name,
        sort_order: subject.sortOrder ?? subjectIndex + 1,
        ...source,
      },
      "code",
    );
    for (const [topicIndex, topic] of subject.topics.entries()) {
      const topicId = await upsertReturningId(
        admin,
        "topics",
        {
          subject_id: subjectId,
          name: topic.name,
          sort_order: topic.sortOrder ?? topicIndex + 1,
          ...source,
        },
        "subject_id,name,source_version",
      );
      if (topic.outcomes.length === 0) continue;
      const { error } = await admin.from("learning_outcomes").upsert(
        topic.outcomes.map((outcome, outcomeIndex) => ({
          topic_id: topicId,
          code: outcome.code,
          description: outcome.description,
          sort_order: outcome.sortOrder ?? outcomeIndex + 1,
          ...source,
        })),
        { onConflict: "code,source_version" },
      );
      if (error) throw new Error(`Could not write learning_outcomes (${error.code}).`);
    }
  }
  return plan;
}
