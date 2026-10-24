import { describe, expect, it } from "vitest";
import type { CatalogSubject } from "@/features/curriculum/catalog";
import { buildMistakeSlots, outcomeOptionGroups } from "./mistake-slots";

const source = {
  sourceName: "test",
  sourceVersion: "1",
  createdAt: "2026-10-24T00:00:00Z",
};

describe("buildMistakeSlots", () => {
  it("opens one slot for every wrong and every blank answer", () => {
    const slots = buildMistakeSlots(
      [{ resultId: "result-1", subjectId: "turkce", wrongCount: 6, blankCount: 2 }],
      [],
    );
    expect(slots.filter((slot) => slot.kind === "wrong")).toHaveLength(6);
    expect(slots.filter((slot) => slot.kind === "blank")).toHaveLength(2);
    expect(slots[0]?.label).toBe("1. yanlış");
    expect(slots[5]?.label).toBe("6. yanlış");
    expect(slots[6]?.label).toBe("1. boş");
    expect(slots.every((slot) => slot.catalogItem === "")).toBe(true);
  });

  it("fills saved links into the matching slots and leaves the rest empty", () => {
    const slots = buildMistakeSlots(
      [{ resultId: "result-1", subjectId: "turkce", wrongCount: 3, blankCount: 0 }],
      [{ resultId: "result-1", kind: "wrong", outcomeId: "kazanim-1" }],
    );
    expect(slots.map((slot) => slot.catalogItem)).toEqual([
      "outcome:kazanim-1",
      "",
      "",
    ]);
  });
});

describe("outcomeOptionGroups", () => {
  it("groups a subject's outcomes by topic", () => {
    const subject = {
      ...source,
      id: "turkce",
      code: "turkce",
      name: "Türkçe",
      sortOrder: 1,
      archived: false,
      topics: [
        {
          ...source,
          id: "okuma",
          name: "Okuma",
          sortOrder: 1,
          archived: false,
          outcomes: [
            {
              ...source,
              id: "o1",
              code: "T.8.3.13",
              description: "Okuduklarını özetler.",
              sortOrder: 1,
              archived: false,
            },
          ],
        },
      ],
    } satisfies CatalogSubject;

    expect(outcomeOptionGroups(subject)).toEqual([
      {
        label: "Okuma",
        options: [{ value: "outcome:o1", label: "T.8.3.13 Okuduklarını özetler." }],
      },
    ]);
  });
});
