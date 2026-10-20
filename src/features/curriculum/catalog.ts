import type { OutcomeRow, SubjectRow, TopicRow } from "./schemas";

type CatalogSource = { sourceName: string; sourceVersion: string; createdAt: string };

export type CatalogOutcome = CatalogSource & {
  id: string;
  code: string;
  description: string;
  sortOrder: number;
  archived: boolean;
};

export type CatalogTopic = CatalogSource & {
  id: string;
  name: string;
  sortOrder: number;
  archived: boolean;
  outcomes: CatalogOutcome[];
};

export type CatalogSubject = CatalogSource & {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  archived: boolean;
  topics: CatalogTopic[];
};

const bySortOrder = <T extends { sortOrder: number }>(
  items: T[],
  label: (item: T) => string,
) =>
  items.sort(
    (a, b) => a.sortOrder - b.sortOrder || label(a).localeCompare(label(b), "tr"),
  );

const source = (row: {
  source_name: string;
  source_version: string;
  created_at: string;
}): CatalogSource => ({
  sourceName: row.source_name,
  sourceVersion: row.source_version,
  createdAt: row.created_at,
});

/**
 * Nests flat rows into subjects → topics → outcomes, ordered by sort order then name.
 * Without `includeArchived`, archived rows and everything under an archived parent are left
 * out, which is what students and parents see.
 */
export function buildCatalogTree(
  rows: { subjects: SubjectRow[]; topics: TopicRow[]; outcomes: OutcomeRow[] },
  { includeArchived }: { includeArchived: boolean },
): CatalogSubject[] {
  const keep = (row: { archived_at: string | null }) =>
    includeArchived || row.archived_at === null;

  const outcomesByTopic = new Map<string, CatalogOutcome[]>();
  for (const row of rows.outcomes.filter(keep)) {
    const list = outcomesByTopic.get(row.topic_id) ?? [];
    list.push({
      id: row.id,
      code: row.code,
      description: row.description,
      sortOrder: row.sort_order,
      archived: row.archived_at !== null,
      ...source(row),
    });
    outcomesByTopic.set(row.topic_id, list);
  }

  const topicsBySubject = new Map<string, CatalogTopic[]>();
  for (const row of rows.topics.filter(keep)) {
    const list = topicsBySubject.get(row.subject_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      archived: row.archived_at !== null,
      outcomes: bySortOrder(outcomesByTopic.get(row.id) ?? [], (item) => item.code),
      ...source(row),
    });
    topicsBySubject.set(row.subject_id, list);
  }

  return bySortOrder(
    rows.subjects.filter(keep).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      sortOrder: row.sort_order,
      archived: row.archived_at !== null,
      topics: bySortOrder(topicsBySubject.get(row.id) ?? [], (item) => item.name),
      ...source(row),
    })),
    (item) => item.name,
  );
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Lower-cases with Turkish rules and drops accents, so "isik", "IŞIK" and "ışık" all match.
 */
export function foldTurkish(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

export type CatalogSelection =
  { kind: "topic"; id: string } | { kind: "outcome"; id: string };

export type CatalogSearchResult = {
  /** Form value, e.g. "topic:<uuid>" or "outcome:<uuid>". */
  value: string;
  kind: CatalogSelection["kind"];
  id: string;
  subjectName: string;
  topicName: string;
  outcomeCode?: string;
  outcomeDescription?: string;
};

export const encodeSelection = (selection: CatalogSelection) =>
  `${selection.kind}:${selection.id}`;

const SELECTION_PATTERN =
  /^(topic|outcome):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function decodeSelection(value: string): CatalogSelection | null {
  const match = SELECTION_PATTERN.exec(value.trim());
  if (!match) return null;
  return { kind: match[1] as CatalogSelection["kind"], id: match[2]!.toLowerCase() };
}

export const SEARCH_RESULT_LIMIT = 30;

/**
 * Every word of the query must appear in the subject name, topic name, outcome code or
 * outcome description. An empty query lists the topics of the chosen subject only, so the
 * list stays short until the student narrows it down.
 */
export function searchCatalog(
  catalog: readonly CatalogSubject[],
  {
    query,
    subjectId,
    outcomesOnly = false,
  }: { query: string; subjectId?: string; outcomesOnly?: boolean },
  limit = SEARCH_RESULT_LIMIT,
): { results: CatalogSearchResult[]; total: number } {
  const words = foldTurkish(query).split(" ").filter(Boolean);
  const subjects = subjectId
    ? catalog.filter((subject) => subject.id === subjectId)
    : catalog;
  const matches = (text: string) => words.every((word) => text.includes(word));

  const results: CatalogSearchResult[] = [];
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      const topicText = foldTurkish(`${subject.name} ${topic.name}`);
      if (words.length === 0) {
        if (subjectId && !outcomesOnly) {
          results.push(topicResult(subject, topic));
        }
        if (subjectId && outcomesOnly) {
          for (const outcome of topic.outcomes) {
            results.push({
              value: encodeSelection({ kind: "outcome", id: outcome.id }),
              kind: "outcome",
              id: outcome.id,
              subjectName: subject.name,
              topicName: topic.name,
              outcomeCode: outcome.code,
              outcomeDescription: outcome.description,
            });
          }
        }
        continue;
      }
      if (!outcomesOnly && matches(topicText)) results.push(topicResult(subject, topic));
      for (const outcome of topic.outcomes) {
        const text = `${topicText} ${foldTurkish(`${outcome.code} ${outcome.description}`)}`;
        if (matches(text)) {
          results.push({
            value: encodeSelection({ kind: "outcome", id: outcome.id }),
            kind: "outcome",
            id: outcome.id,
            subjectName: subject.name,
            topicName: topic.name,
            outcomeCode: outcome.code,
            outcomeDescription: outcome.description,
          });
        }
      }
    }
  }
  return { results: results.slice(0, limit), total: results.length };
}

function topicResult(subject: CatalogSubject, topic: CatalogTopic): CatalogSearchResult {
  return {
    value: encodeSelection({ kind: "topic", id: topic.id }),
    kind: "topic",
    id: topic.id,
    subjectName: subject.name,
    topicName: topic.name,
  };
}

/** Finds a selected item again, e.g. to show what was picked after the list was filtered. */
export function describeSelection(
  catalog: readonly CatalogSubject[],
  selection: CatalogSelection,
): {
  subject: CatalogSubject;
  topic: CatalogTopic;
  outcome?: CatalogOutcome;
} | null {
  for (const subject of catalog) {
    for (const topic of subject.topics) {
      if (selection.kind === "topic" && topic.id === selection.id) {
        return { subject, topic };
      }
      if (selection.kind === "outcome") {
        const outcome = topic.outcomes.find((item) => item.id === selection.id);
        if (outcome) return { subject, topic, outcome };
      }
    }
  }
  return null;
}
