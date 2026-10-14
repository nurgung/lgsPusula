import { describe, expect, it } from "vitest";
import {
  buildCatalogTree,
  decodeSelection,
  describeSelection,
  encodeSelection,
  foldTurkish,
  searchCatalog,
} from "./catalog";
import type { OutcomeRow, SubjectRow, TopicRow } from "./schemas";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const common = {
  source_name: "Kurgusal kaynak",
  source_version: "deneme-1",
  created_at: "2026-10-13T09:00:00Z",
  archived_at: null,
};

const subject = (
  n: number,
  name: string,
  extra: Partial<SubjectRow> = {},
): SubjectRow => ({
  id: uuid(n),
  code: `ders_${n}`,
  name,
  sort_order: 0,
  ...common,
  ...extra,
});
const topic = (
  n: number,
  subjectN: number,
  name: string,
  extra: Partial<TopicRow> = {},
): TopicRow => ({
  id: uuid(n),
  subject_id: uuid(subjectN),
  name,
  sort_order: 0,
  ...common,
  ...extra,
});
const outcome = (
  n: number,
  topicN: number,
  code: string,
  description: string,
  extra: Partial<OutcomeRow> = {},
): OutcomeRow => ({
  id: uuid(n),
  topic_id: uuid(topicN),
  code,
  description,
  sort_order: 0,
  ...common,
  ...extra,
});

const rows = {
  subjects: [
    subject(1, "Matematik", { sort_order: 2 }),
    subject(2, "Fen Bilimleri", { sort_order: 1 }),
    subject(3, "Eski Ders", { archived_at: "2026-10-01T00:00:00Z" }),
  ],
  topics: [
    topic(11, 1, "Üslü ifadeler", { sort_order: 2 }),
    topic(12, 1, "Çarpanlar ve katlar", { sort_order: 1 }),
    topic(13, 1, "Eski konu", { archived_at: "2026-10-01T00:00:00Z" }),
    topic(21, 2, "Işık ve ses"),
    topic(31, 3, "Eski dersin konusu"),
  ],
  outcomes: [
    outcome(111, 11, "M.8.1.2", "Üslü ifadelerle çarpma yapar."),
    outcome(112, 11, "M.8.1.1", "Üslü ifadeleri tanır."),
    outcome(113, 11, "M.8.1.9", "Eski kazanım", { archived_at: "2026-10-01T00:00:00Z" }),
    outcome(131, 13, "M.8.9.1", "Eski konunun kazanımı"),
    outcome(211, 21, "F.8.5.1", "Işığın yansımasını açıklar."),
  ],
};

describe("buildCatalogTree", () => {
  it("hides archived rows and everything under an archived parent for students", () => {
    const tree = buildCatalogTree(rows, { includeArchived: false });
    expect(tree.map((item) => item.name)).toEqual(["Fen Bilimleri", "Matematik"]);
    const math = tree.find((item) => item.name === "Matematik")!;
    expect(math.topics.map((item) => item.name)).toEqual([
      "Çarpanlar ve katlar",
      "Üslü ifadeler",
    ]);
    expect(math.topics[1]!.outcomes.map((item) => item.code)).toEqual([
      "M.8.1.1",
      "M.8.1.2",
    ]);
    const allCodes = tree.flatMap((s) =>
      s.topics.flatMap((t) => t.outcomes.map((o) => o.code)),
    );
    expect(allCodes).not.toContain("M.8.1.9");
    expect(allCodes).not.toContain("M.8.9.1");
  });

  it("keeps archived rows, marked, for the admin pages", () => {
    const tree = buildCatalogTree(rows, { includeArchived: true });
    expect(tree.find((item) => item.name === "Eski Ders")?.archived).toBe(true);
    const math = tree.find((item) => item.name === "Matematik")!;
    expect(math.topics.find((item) => item.name === "Eski konu")?.archived).toBe(true);
    expect(
      math.topics.flatMap((t) => t.outcomes).find((o) => o.code === "M.8.1.9")?.archived,
    ).toBe(true);
  });

  it("carries the source and entry date of every row (decision 0.6)", () => {
    const [first] = buildCatalogTree(rows, { includeArchived: false });
    expect(first).toMatchObject({
      sourceName: "Kurgusal kaynak",
      sourceVersion: "deneme-1",
      createdAt: "2026-10-13T09:00:00Z",
    });
  });
});

describe("foldTurkish", () => {
  it("matches with or without Turkish characters and capitals", () => {
    expect(foldTurkish("IŞIK")).toBe("isik");
    expect(foldTurkish("ışık")).toBe("isik");
    expect(foldTurkish("İnkılap Tarihi")).toBe("inkilap tarihi");
    expect(foldTurkish("  Çarpanlar   ve  Katlar ")).toBe("carpanlar ve katlar");
    expect(foldTurkish("Üslü Öğe")).toBe("uslu oge");
  });
});

describe("searchCatalog", () => {
  const catalog = buildCatalogTree(rows, { includeArchived: false });

  it("lists nothing until a subject or a word is given", () => {
    expect(searchCatalog(catalog, { query: "  " })).toEqual({ results: [], total: 0 });
  });

  it("lists the topics of the chosen subject when the query is empty", () => {
    const { results } = searchCatalog(catalog, { query: "", subjectId: uuid(1) });
    expect(results.map((item) => item.topicName)).toEqual([
      "Çarpanlar ve katlar",
      "Üslü ifadeler",
    ]);
    expect(results.every((item) => item.kind === "topic")).toBe(true);
  });

  it("finds topics and outcomes without Turkish characters", () => {
    const { results } = searchCatalog(catalog, { query: "isik" });
    expect(results.map((item) => item.value)).toEqual([
      encodeSelection({ kind: "topic", id: uuid(21) }),
      encodeSelection({ kind: "outcome", id: uuid(211) }),
    ]);
  });

  it("finds an outcome by its code and needs every word to match", () => {
    expect(
      searchCatalog(catalog, { query: "m.8.1.2" }).results.map(
        (item) => item.outcomeCode,
      ),
    ).toEqual(["M.8.1.2"]);
    expect(searchCatalog(catalog, { query: "uslu carpma" }).results).toHaveLength(1);
    expect(searchCatalog(catalog, { query: "uslu ışık" }).results).toHaveLength(0);
  });

  it("limits to the chosen subject", () => {
    expect(searchCatalog(catalog, { query: "isik", subjectId: uuid(1) }).total).toBe(0);
  });

  it("never returns archived rows when given the student catalog", () => {
    expect(searchCatalog(catalog, { query: "eski" }).total).toBe(0);
  });

  it("reports the full count when results are cut off", () => {
    const { results, total } = searchCatalog(catalog, { query: "uslu" }, 1);
    expect(results).toHaveLength(1);
    expect(total).toBe(3);
  });
});

describe("selection values", () => {
  const catalog = buildCatalogTree(rows, { includeArchived: false });

  it("round-trips and rejects anything else", () => {
    const value = encodeSelection({ kind: "outcome", id: uuid(211) });
    expect(decodeSelection(value)).toEqual({ kind: "outcome", id: uuid(211) });
    expect(decodeSelection("subject:" + uuid(1))).toBeNull();
    expect(decodeSelection("topic:1")).toBeNull();
    expect(decodeSelection("")).toBeNull();
  });

  it("describes a selected outcome with its topic and subject", () => {
    const found = describeSelection(catalog, { kind: "outcome", id: uuid(211) });
    expect(found?.subject.name).toBe("Fen Bilimleri");
    expect(found?.topic.name).toBe("Işık ve ses");
    expect(found?.outcome?.code).toBe("F.8.5.1");
    expect(describeSelection(catalog, { kind: "outcome", id: uuid(113) })).toBeNull();
  });
});
