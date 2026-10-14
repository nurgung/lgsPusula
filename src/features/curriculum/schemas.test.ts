import { describe, expect, it } from "vitest";
import {
  archiveSchema,
  catalogFileSchema,
  outcomeCreateSchema,
  sortOrderSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
  topicUpdateSchema,
} from "./schemas";

const id = "6f1c2a8e-3b4d-4e5f-9a0b-1c2d3e4f5a6b";
const source = { sourceName: "Kurgusal kaynak", sourceVersion: "deneme-1" };

describe("sortOrderSchema", () => {
  it("treats an empty field as 0 and reads whole numbers", () => {
    expect(sortOrderSchema.parse("")).toBe(0);
    expect(sortOrderSchema.parse("  ")).toBe(0);
    expect(sortOrderSchema.parse(undefined)).toBe(0);
    expect(sortOrderSchema.parse(" 12 ")).toBe(12);
    expect(sortOrderSchema.parse(7)).toBe(7);
  });

  it.each(["-1", "1.5", "1e3", "abc", "10000"])("rejects %s", (value) => {
    expect(sortOrderSchema.safeParse(value).success).toBe(false);
  });

  it("rejects negative and fractional numbers from the import file", () => {
    expect(sortOrderSchema.safeParse(-1).success).toBe(false);
    expect(sortOrderSchema.safeParse(2.5).success).toBe(false);
  });
});

describe("subject schemas", () => {
  it("lower-cases and trims the code", () => {
    const parsed = subjectCreateSchema.parse({
      code: "  Matematik ",
      name: " Matematik ",
      sortOrder: "",
      ...source,
    });
    expect(parsed).toMatchObject({ code: "matematik", name: "Matematik", sortOrder: 0 });
  });

  it.each(["m", "1matematik", "fen-bilimleri", "türkçe", "a".repeat(33)])(
    "rejects the code %s",
    (code) => {
      expect(
        subjectCreateSchema.safeParse({ code, name: "Ders", sortOrder: "", ...source })
          .success,
      ).toBe(false);
    },
  );

  it("requires a name and source on every row (decision 0.6)", () => {
    const result = subjectCreateSchema.safeParse({
      code: "matematik",
      name: " ",
      sortOrder: "",
      sourceName: "",
      sourceVersion: "",
    });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining(["name", "sourceName", "sourceVersion"]),
    );
  });

  it("does not accept a code on update, so the stable key cannot change", () => {
    const parsed = subjectUpdateSchema.parse({
      id,
      code: "baska_kod",
      name: "Matematik",
      sortOrder: "1",
      ...source,
    });
    expect(parsed).not.toHaveProperty("code");
  });
});

describe("topic and outcome schemas", () => {
  it("does not accept a new parent on update, so rows cannot be moved", () => {
    const parsed = topicUpdateSchema.parse({
      id,
      subjectId: "00000000-0000-4000-8000-000000000000",
      name: "Konu",
      sortOrder: "",
      ...source,
    });
    expect(parsed).not.toHaveProperty("subjectId");
  });

  it("checks outcome codes and description length", () => {
    const base = { topicId: id, sortOrder: "", ...source };
    expect(
      outcomeCreateSchema.safeParse({
        ...base,
        code: "M.8.1.1.1",
        description: "Açıklama",
      }).success,
    ).toBe(true);
    expect(
      outcomeCreateSchema.safeParse({ ...base, code: "M 8", description: "Açıklama" })
        .success,
    ).toBe(false);
    expect(
      outcomeCreateSchema.safeParse({
        ...base,
        code: "M.8",
        description: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("rejects an id that is not a uuid", () => {
    expect(
      outcomeCreateSchema.safeParse({
        topicId: "1",
        code: "M.8",
        description: "Açıklama",
        sortOrder: "",
        ...source,
      }).success,
    ).toBe(false);
  });
});

describe("archiveSchema", () => {
  it("reads the archived flag and the entity", () => {
    expect(archiveSchema.parse({ entity: "topic", id, archived: "true" })).toEqual({
      entity: "topic",
      id,
      archived: true,
    });
    expect(
      archiveSchema.safeParse({ entity: "profiles", id, archived: "true" }).success,
    ).toBe(false);
  });
});

describe("catalogFileSchema", () => {
  const file = (subjects: unknown) => ({
    source: { name: "Kurgusal kaynak", version: "deneme-1" },
    subjects,
  });

  it("accepts a nested file and defaults example to false", () => {
    const parsed = catalogFileSchema.parse(
      file([
        {
          code: "matematik",
          name: "Matematik",
          topics: [
            { name: "Konu", outcomes: [{ code: "M.1", description: "Açıklama" }] },
          ],
        },
      ]),
    );
    expect(parsed.example).toBe(false);
    expect(parsed.subjects[0]?.topics[0]?.outcomes).toHaveLength(1);
  });

  it("rejects unknown fields, so a typo is not silently ignored", () => {
    expect(
      catalogFileSchema.safeParse(file([{ code: "matematik", name: "M", topcs: [] }]))
        .success,
    ).toBe(false);
  });

  it("rejects duplicate subject codes, topic names and outcome codes", () => {
    const result = catalogFileSchema.safeParse(
      file([
        {
          code: "matematik",
          name: "Matematik",
          topics: [
            { name: "Konu", outcomes: [{ code: "M.1", description: "A" }] },
            { name: "Konu", outcomes: [{ code: "M.1", description: "B" }] },
          ],
        },
        { code: "matematik", name: "Tekrar" },
      ]),
    );
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message).join("\n");
    expect(messages).toContain("Ders kodu dosyada iki kez geçiyor: matematik");
    expect(messages).toContain("Konu aynı derste iki kez geçiyor: Konu");
    expect(messages).toContain("Kazanım kodu dosyada iki kez geçiyor: M.1");
  });

  it("requires at least one subject", () => {
    expect(catalogFileSchema.safeParse(file([])).success).toBe(false);
  });
});
