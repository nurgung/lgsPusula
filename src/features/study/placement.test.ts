import { describe, expect, it } from "vitest";
import { resolveStudyPlacement, type PlacementFacts } from "./placement";

const subjectId = "00000000-0000-4000-8000-000000000001";
const topicId = "00000000-0000-4000-8000-000000000011";
const outcomeId = "00000000-0000-4000-8000-000000000111";

const facts = (overrides: Partial<PlacementFacts> = {}): PlacementFacts => ({
  subject: { id: subjectId, archived: false },
  topic: { id: topicId, subjectId, archived: false },
  outcome: null,
  ...overrides,
});

describe("resolveStudyPlacement", () => {
  it("accepts a subject without a topic", () => {
    expect(
      resolveStudyPlacement({
        subjectId,
        selection: null,
        facts: facts({ topic: null }),
      }),
    ).toEqual({ ok: true, topicId: null, outcomeId: null });
  });

  it("rejects a topic from another subject and a newly archived topic", () => {
    const mismatch = resolveStudyPlacement({
      subjectId,
      selection: { kind: "topic", id: topicId },
      facts: facts({ topic: { id: topicId, subjectId: "other", archived: false } }),
    });
    expect(mismatch).toMatchObject({ ok: false, code: "topic_subject_mismatch" });

    const archived = resolveStudyPlacement({
      subjectId,
      selection: { kind: "topic", id: topicId },
      facts: facts({ topic: { id: topicId, subjectId, archived: true } }),
    });
    expect(archived).toMatchObject({ ok: false, code: "topic_archived" });
  });

  it("keeps an archived topic that the log already points at", () => {
    expect(
      resolveStudyPlacement({
        subjectId,
        selection: { kind: "topic", id: topicId },
        facts: facts({
          subject: { id: subjectId, archived: true },
          topic: { id: topicId, subjectId, archived: true },
        }),
        previous: { subjectId, topicId, outcomeId: null },
      }),
    ).toEqual({ ok: true, topicId, outcomeId: null });
  });

  it("rejects an outcome that belongs to another subject", () => {
    const result = resolveStudyPlacement({
      subjectId,
      selection: { kind: "outcome", id: outcomeId },
      facts: facts({
        topic: null,
        outcome: {
          id: outcomeId,
          topicId,
          subjectId: "other",
          archived: false,
          topicArchived: false,
        },
      }),
    });
    expect(result).toMatchObject({ ok: false, code: "outcome_subject_mismatch" });
  });
});
