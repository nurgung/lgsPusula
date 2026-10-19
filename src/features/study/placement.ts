import type { CatalogSelection } from "@/features/curriculum/catalog";
import type { PlacementError } from "./messages";

export type PlacementSubject = { id: string; archived: boolean };

export type PlacementTopic = {
  id: string;
  subjectId: string;
  archived: boolean;
};

export type PlacementOutcome = {
  id: string;
  topicId: string;
  subjectId: string;
  archived: boolean;
  topicArchived: boolean;
};

/** What was already stored on this log. The same archived row may stay; a new one may not. */
export type PreviousPlacement = {
  subjectId: string;
  topicId: string | null;
  outcomeId: string | null;
};

export type PlacementFacts = {
  subject: PlacementSubject | null;
  topic: PlacementTopic | null;
  outcome: PlacementOutcome | null;
};

export type ResolvedPlacement =
  | { ok: true; topicId: string | null; outcomeId: string | null }
  | { ok: false; field: "subjectId" | "catalogItem"; code: PlacementError };

function fail(
  field: "subjectId" | "catalogItem",
  code: PlacementError,
): ResolvedPlacement {
  return { ok: false, field, code };
}

/**
 * Checks that the chosen subject exists and that an optional topic or outcome belongs
 * to it. Archived catalog rows cannot be newly selected. A log that already points at
 * one may keep it, because past work stays attached when a catalogue row is retired.
 */
export function resolveStudyPlacement(input: {
  subjectId: string;
  selection: CatalogSelection | null;
  facts: PlacementFacts;
  previous?: PreviousPlacement | null;
}): ResolvedPlacement {
  const { subjectId, selection, facts, previous } = input;
  const subject = facts.subject;
  if (!subject || subject.id !== subjectId) return fail("subjectId", "subject_missing");

  const keepingSubject = previous?.subjectId === subjectId;
  if (subject.archived && !keepingSubject) return fail("subjectId", "subject_archived");

  if (!selection) return { ok: true, topicId: null, outcomeId: null };

  if (selection.kind === "topic") {
    const topic = facts.topic;
    if (!topic || topic.id !== selection.id) return fail("catalogItem", "topic_missing");
    if (topic.subjectId !== subjectId)
      return fail("catalogItem", "topic_subject_mismatch");
    const keeping = previous?.topicId === topic.id && previous.outcomeId === null;
    if (topic.archived && !keeping) return fail("catalogItem", "topic_archived");
    if (subject.archived && !keeping) return fail("subjectId", "subject_archived");
    return { ok: true, topicId: topic.id, outcomeId: null };
  }

  const outcome = facts.outcome;
  if (!outcome || outcome.id !== selection.id)
    return fail("catalogItem", "outcome_missing");
  if (outcome.subjectId !== subjectId) {
    return fail("catalogItem", "outcome_subject_mismatch");
  }
  const keeping = previous?.outcomeId === outcome.id;
  if ((outcome.archived || outcome.topicArchived) && !keeping) {
    return fail("catalogItem", outcome.archived ? "outcome_archived" : "topic_archived");
  }
  if (subject.archived && !keeping) return fail("subjectId", "subject_archived");
  return { ok: true, topicId: outcome.topicId, outcomeId: outcome.id };
}
