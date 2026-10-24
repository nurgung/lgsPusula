import type { CatalogSubject } from "@/features/curriculum/catalog";

export type MistakeSlotKind = "wrong" | "blank";

export type MistakeSlotSubject = {
  resultId: string;
  subjectId: string;
  wrongCount: number;
  blankCount: number;
};

export type MistakeSlot = {
  key: string;
  resultId: string;
  subjectId: string;
  kind: MistakeSlotKind;
  label: string;
  catalogItem: string;
};

export type OutcomeOptionGroup = {
  label: string;
  options: { value: string; label: string }[];
};

/**
 * One dropdown per wrong answer and one per blank answer.
 * Saved links fill the slots in order; the rest stay empty.
 */
export function buildMistakeSlots(
  subjects: readonly MistakeSlotSubject[],
  initialRows: readonly {
    resultId: string;
    kind: MistakeSlotKind;
    outcomeId: string;
  }[],
): MistakeSlot[] {
  const slots: MistakeSlot[] = [];
  for (const subject of subjects) {
    const saved = initialRows.filter((row) => row.resultId === subject.resultId);
    slots.push(
      ...slotsFor(subject, "wrong", subject.wrongCount, saved),
      ...slotsFor(subject, "blank", subject.blankCount, saved),
    );
  }
  return slots;
}

function slotsFor(
  subject: MistakeSlotSubject,
  kind: MistakeSlotKind,
  count: number,
  saved: readonly { kind: MistakeSlotKind; outcomeId: string }[],
): MistakeSlot[] {
  const word = kind === "wrong" ? "yanlış" : "boş";
  const linked = saved.filter((row) => row.kind === kind);
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const existing = linked[index];
    return {
      key: `${subject.resultId}-${kind}-${index}`,
      resultId: subject.resultId,
      subjectId: subject.subjectId,
      kind,
      label: `${index + 1}. ${word}`,
      catalogItem: existing ? `outcome:${existing.outcomeId}` : "",
    };
  });
}

/** Outcomes for one subject, grouped by topic, for a native dropdown. */
export function outcomeOptionGroups(
  subject: CatalogSubject | undefined,
): OutcomeOptionGroup[] {
  if (!subject) return [];
  return subject.topics
    .filter((topic) => topic.outcomes.length > 0)
    .map((topic) => ({
      label: topic.name,
      options: topic.outcomes.map((outcome) => ({
        value: `outcome:${outcome.id}`,
        label: `${outcome.code} ${outcome.description}`,
      })),
    }));
}
