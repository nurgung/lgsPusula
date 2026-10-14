// Shared by the admin forms, the server actions and the import script (scripts/catalog.ts).
// Keep this file free of path aliases and server-only imports so Node can load it directly.
import { z } from "zod";

export const SUBJECT_CODE_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;
export const OUTCOME_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;

export const CATALOG_LIMITS = {
  subjectName: 80,
  topicName: 160,
  outcomeDescription: 500,
  sourceName: 120,
  sourceVersion: 40,
  sortOrderMax: 9999,
  subjectsPerFile: 30,
  topicsPerSubject: 200,
  outcomesPerTopic: 200,
} as const;

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} yaz.` })
    .trim()
    .min(1, `${label} yaz.`)
    .max(max, `${label} en fazla ${max} karakter olabilir.`);

/** Empty means 0. Form fields arrive as text; the import file may use numbers. */
export const sortOrderSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return 0;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (trimmed === "") return 0;
    return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
  },
  z
    .number({ error: "Sıra için 0 veya pozitif bir tam sayı yaz." })
    .int("Sıra için 0 veya pozitif bir tam sayı yaz.")
    .min(0, "Sıra için 0 veya pozitif bir tam sayı yaz.")
    .max(
      CATALOG_LIMITS.sortOrderMax,
      `Sıra en fazla ${CATALOG_LIMITS.sortOrderMax} olabilir.`,
    ),
);

export const subjectCodeSchema = z
  .string({ error: "Ders kodunu yaz." })
  .trim()
  .toLowerCase()
  .min(1, "Ders kodunu yaz.")
  .regex(
    SUBJECT_CODE_PATTERN,
    "Ders kodu 2–32 karakter olmalı; küçük harfle başlamalı ve yalnızca a–z, rakam ve _ içermeli.",
  );

export const outcomeCodeSchema = z
  .string({ error: "Kazanım kodunu yaz." })
  .trim()
  .min(1, "Kazanım kodunu yaz.")
  .regex(
    OUTCOME_CODE_PATTERN,
    "Kazanım kodu en fazla 40 karakter olmalı; harf, rakam, nokta, tire ve _ içerebilir.",
  );

const sourceFields = {
  sourceName: requiredText("Kaynak adını", CATALOG_LIMITS.sourceName),
  sourceVersion: requiredText("Kaynak sürümünü", CATALOG_LIMITS.sourceVersion),
};

const idSchema = z.uuid("Kayıt bulunamadı.");

export const subjectCreateSchema = z.object({
  code: subjectCodeSchema,
  name: requiredText("Ders adını", CATALOG_LIMITS.subjectName),
  sortOrder: sortOrderSchema,
  ...sourceFields,
});

/** The code is the stable key used by the import file, so it cannot be edited. */
export const subjectUpdateSchema = subjectCreateSchema
  .omit({ code: true })
  .extend({ id: idSchema });

export const topicCreateSchema = z.object({
  subjectId: idSchema,
  name: requiredText("Konu adını", CATALOG_LIMITS.topicName),
  sortOrder: sortOrderSchema,
  ...sourceFields,
});

/** A topic cannot move to another subject: past records would silently change meaning. */
export const topicUpdateSchema = topicCreateSchema
  .omit({ subjectId: true })
  .extend({ id: idSchema });

export const outcomeCreateSchema = z.object({
  topicId: idSchema,
  code: outcomeCodeSchema,
  description: requiredText("Kazanım açıklamasını", CATALOG_LIMITS.outcomeDescription),
  sortOrder: sortOrderSchema,
  ...sourceFields,
});

export const outcomeUpdateSchema = outcomeCreateSchema
  .omit({ topicId: true })
  .extend({ id: idSchema });

export const CATALOG_ENTITIES = ["subject", "topic", "learning_outcome"] as const;
export type CatalogEntity = (typeof CATALOG_ENTITIES)[number];

export const archiveSchema = z.object({
  entity: z.enum(CATALOG_ENTITIES),
  id: idSchema,
  archived: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;
export type TopicCreateInput = z.infer<typeof topicCreateSchema>;
export type TopicUpdateInput = z.infer<typeof topicUpdateSchema>;
export type OutcomeCreateInput = z.infer<typeof outcomeCreateSchema>;
export type OutcomeUpdateInput = z.infer<typeof outcomeUpdateSchema>;

// ---------------------------------------------------------------------------
// Import file (scripts/catalog.ts). One source name/version applies to every row in the file.
// ---------------------------------------------------------------------------

const fileOutcomeSchema = z.strictObject({
  code: outcomeCodeSchema,
  description: requiredText("Kazanım açıklamasını", CATALOG_LIMITS.outcomeDescription),
  sortOrder: sortOrderSchema.optional(),
});

const fileTopicSchema = z.strictObject({
  name: requiredText("Konu adını", CATALOG_LIMITS.topicName),
  sortOrder: sortOrderSchema.optional(),
  outcomes: z.array(fileOutcomeSchema).max(CATALOG_LIMITS.outcomesPerTopic).default([]),
});

const fileSubjectSchema = z.strictObject({
  code: subjectCodeSchema,
  name: requiredText("Ders adını", CATALOG_LIMITS.subjectName),
  sortOrder: sortOrderSchema.optional(),
  topics: z.array(fileTopicSchema).max(CATALOG_LIMITS.topicsPerSubject).default([]),
});

export const catalogFileSchema = z
  .strictObject({
    /** Example files hold fictional data and are refused outside local Supabase. */
    example: z.boolean().default(false),
    source: z.strictObject({
      name: sourceFields.sourceName,
      version: sourceFields.sourceVersion,
    }),
    subjects: z.array(fileSubjectSchema).min(1).max(CATALOG_LIMITS.subjectsPerFile),
  })
  .superRefine((file, ctx) => {
    const subjectCodes = new Set<string>();
    const outcomeCodes = new Set<string>();
    file.subjects.forEach((subject, subjectIndex) => {
      if (subjectCodes.has(subject.code)) {
        ctx.addIssue({
          code: "custom",
          path: ["subjects", subjectIndex, "code"],
          message: `Ders kodu dosyada iki kez geçiyor: ${subject.code}`,
        });
      }
      subjectCodes.add(subject.code);

      const topicNames = new Set<string>();
      subject.topics.forEach((topic, topicIndex) => {
        if (topicNames.has(topic.name)) {
          ctx.addIssue({
            code: "custom",
            path: ["subjects", subjectIndex, "topics", topicIndex, "name"],
            message: `Konu aynı derste iki kez geçiyor: ${topic.name}`,
          });
        }
        topicNames.add(topic.name);

        topic.outcomes.forEach((outcome, outcomeIndex) => {
          if (outcomeCodes.has(outcome.code)) {
            ctx.addIssue({
              code: "custom",
              path: [
                "subjects",
                subjectIndex,
                "topics",
                topicIndex,
                "outcomes",
                outcomeIndex,
                "code",
              ],
              message: `Kazanım kodu dosyada iki kez geçiyor: ${outcome.code}`,
            });
          }
          outcomeCodes.add(outcome.code);
        });
      });
    });
  });

export type CatalogFile = z.infer<typeof catalogFileSchema>;

// ---------------------------------------------------------------------------
// Database rows
// ---------------------------------------------------------------------------

const rowCommon = {
  id: z.uuid(),
  sort_order: z.number().int(),
  source_name: z.string(),
  source_version: z.string(),
  created_at: z.string(),
  archived_at: z.string().nullable(),
};

export const subjectRowSchema = z.object({
  ...rowCommon,
  code: z.string(),
  name: z.string(),
});

export const topicRowSchema = z.object({
  ...rowCommon,
  subject_id: z.uuid(),
  name: z.string(),
});

export const outcomeRowSchema = z.object({
  ...rowCommon,
  topic_id: z.uuid(),
  code: z.string(),
  description: z.string(),
});

export type SubjectRow = z.infer<typeof subjectRowSchema>;
export type TopicRow = z.infer<typeof topicRowSchema>;
export type OutcomeRow = z.infer<typeof outcomeRowSchema>;
