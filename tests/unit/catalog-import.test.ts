// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  isLocalSupabase,
  parseCatalogFile,
  planCatalogImport,
  type ExistingCatalog,
} from "../../scripts/lib/catalog-import.ts";

const file = {
  source: { name: "Kurgusal kaynak", version: "v2" },
  subjects: [
    {
      code: "matematik",
      name: "Matematik",
      topics: [
        {
          name: "Üslü ifadeler",
          outcomes: [
            { code: "M.1", description: "Bir" },
            { code: "M.2", description: "İki" },
          ],
        },
      ],
    },
    { code: "fen", name: "Fen", topics: [{ name: "Işık", outcomes: [] }] },
  ],
};

const parse = (value: unknown) => {
  const result = parseCatalogFile(JSON.stringify(value));
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.file;
};

const empty: ExistingCatalog = { subjects: [], topics: [], outcomes: [] };

describe("parseCatalogFile", () => {
  it("rejects text that is not JSON", () => {
    expect(parseCatalogFile("{")).toEqual({
      ok: false,
      errors: ["Dosya geçerli bir JSON değil."],
    });
  });

  it("points at the field that is wrong", () => {
    const result = parseCatalogFile(
      JSON.stringify({ ...file, subjects: [{ code: "Fen Bilimleri", name: "Fen" }] }),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatch(/^subjects\.0\.code: /);
  });

  it("accepts the example file in the repository and it is marked as an example", async () => {
    const text = await readFile("data/catalog/ornek-katalog.json", "utf8");
    const result = parseCatalogFile(text);
    expect(result.ok).toBe(true);
    expect(result.ok && result.file.example).toBe(true);
  });
});

describe("isLocalSupabase", () => {
  it("only treats loopback hosts as local", () => {
    expect(isLocalSupabase("http://127.0.0.1:55321")).toBe(true);
    expect(isLocalSupabase("http://localhost:55321")).toBe(true);
    expect(isLocalSupabase("https://abcd.supabase.co")).toBe(false);
  });
});

describe("planCatalogImport", () => {
  it("creates everything on an empty catalog", () => {
    expect(planCatalogImport(parse(file), empty)).toEqual({
      subjects: { create: 2, update: 0 },
      topics: { create: 2, update: 0 },
      outcomes: { create: 2, update: 0 },
      conflicts: [],
    });
  });

  it("updates rows matched by natural key, so a second run adds nothing", () => {
    const existing: ExistingCatalog = {
      subjects: [
        { id: "s1", code: "matematik" },
        { id: "s2", code: "fen" },
      ],
      topics: [
        { id: "t1", subject_id: "s1", name: "Üslü ifadeler", source_version: "v2" },
        { id: "t2", subject_id: "s2", name: "Işık", source_version: "v2" },
      ],
      outcomes: [
        { id: "o1", topic_id: "t1", code: "M.1", source_version: "v2" },
        { id: "o2", topic_id: "t1", code: "M.2", source_version: "v2" },
      ],
    };
    expect(planCatalogImport(parse(file), existing)).toEqual({
      subjects: { create: 0, update: 2 },
      topics: { create: 0, update: 2 },
      outcomes: { create: 0, update: 2 },
      conflicts: [],
    });
  });

  it("adds new topic and outcome rows for a new source version and keeps the old ones", () => {
    const existing: ExistingCatalog = {
      subjects: [{ id: "s1", code: "matematik" }],
      topics: [
        { id: "t1", subject_id: "s1", name: "Üslü ifadeler", source_version: "v1" },
      ],
      outcomes: [{ id: "o1", topic_id: "t1", code: "M.1", source_version: "v1" }],
    };
    const plan = planCatalogImport(parse(file), existing);
    expect(plan.topics).toEqual({ create: 2, update: 0 });
    expect(plan.outcomes).toEqual({ create: 2, update: 0 });
    expect(plan.conflicts).toEqual([]);
  });

  it("stops instead of moving an outcome to another topic", () => {
    const existing: ExistingCatalog = {
      subjects: [{ id: "s1", code: "matematik" }],
      topics: [
        { id: "t1", subject_id: "s1", name: "Üslü ifadeler", source_version: "v2" },
        { id: "t9", subject_id: "s1", name: "Başka konu", source_version: "v2" },
      ],
      outcomes: [{ id: "o1", topic_id: "t9", code: "M.1", source_version: "v2" }],
    };
    const plan = planCatalogImport(parse(file), existing);
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]).toContain("M.1 (v2) başka bir konuya kayıtlı");
  });
});
