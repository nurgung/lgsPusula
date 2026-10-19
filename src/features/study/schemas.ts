import { z } from "zod";
import { decodeSelection } from "@/features/curriculum/catalog";
import { isRealIsoDate, STUDY_DATE_MIN } from "./calendar";

export const STUDY_LIMITS = {
  questionCount: 500,
  durationMinutes: 1440,
  goalQuestions: 2000,
} as const;

const wholeNumber = (label: string, max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === "number") return Number.isInteger(value) ? value : Number.NaN;
      if (typeof value !== "string") return Number.NaN;
      const trimmed = value.trim();
      if (!/^\d+$/.test(trimmed)) return Number.NaN;
      const parsed = Number(trimmed);
      return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
    },
    z
      .number({ error: `${label} için 0 veya daha büyük bir tam sayı yaz.` })
      .int(`${label} için 0 veya daha büyük bir tam sayı yaz.`)
      .min(0, `${label} eksi olamaz.`)
      .max(max, `${label} en fazla ${max} olabilir.`),
  );

const isoDateField = z
  .string({ error: "Tarihi seç." })
  .trim()
  .refine(isRealIsoDate, "Tarihi seç.");

/**
 * Shared rules for creating and editing a study log. `today` is the Europe/Istanbul
 * civil date, passed in so tests can freeze the clock. Question counts cannot be
 * negative, and doğru + yanlış + boş must equal the question count.
 */
export function studyLogSchema(today: string) {
  return z
    .object({
      studiedOn: isoDateField,
      subjectId: z.uuid("Dersi listeden seç."),
      catalogItem: z
        .string()
        .trim()
        .refine(
          (value) => value === "" || decodeSelection(value) !== null,
          "Konuyu listeden seç.",
        ),
      questionCount: wholeNumber("Soru sayısı", STUDY_LIMITS.questionCount),
      correctCount: wholeNumber("Doğru", STUDY_LIMITS.questionCount),
      wrongCount: wholeNumber("Yanlış", STUDY_LIMITS.questionCount),
      blankCount: wholeNumber("Boş", STUDY_LIMITS.questionCount),
      durationMinutes: wholeNumber("Süre", STUDY_LIMITS.durationMinutes),
    })
    .superRefine((value, ctx) => {
      if (value.studiedOn < STUDY_DATE_MIN) {
        ctx.addIssue({
          code: "custom",
          path: ["studiedOn"],
          message: "Bu tarih çok eski. Daha yeni bir gün seç.",
        });
      }
      if (value.studiedOn > today) {
        ctx.addIssue({
          code: "custom",
          path: ["studiedOn"],
          message: "İleri bir tarih seçilemez.",
        });
      }
      if (value.questionCount < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["questionCount"],
          message: "En az 1 soru yaz.",
        });
      }
      const sum = value.correctCount + value.wrongCount + value.blankCount;
      if (
        Number.isFinite(sum) &&
        Number.isFinite(value.questionCount) &&
        sum !== value.questionCount
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["questionCount"],
          message: "Doğru, yanlış ve boş toplamı soru sayısına eşit olmalı.",
        });
      }
    });
}

export const studyLogRequestSchema = z.uuid(
  "Kayıt gönderilemedi. Sayfayı yenileyip tekrar dene.",
);

export function studyGoalSchema() {
  return z.object({
    period: z.enum(["day", "week"], { error: "Günlük veya haftalık hedef seç." }),
    subjectId: z.union([z.literal(""), z.uuid("Dersi listeden seç.")]),
    targetQuestions: z.preprocess(
      (value) => {
        if (typeof value === "number")
          return Number.isInteger(value) ? value : Number.NaN;
        if (typeof value !== "string") return Number.NaN;
        const trimmed = value.trim();
        if (!/^\d+$/.test(trimmed)) return Number.NaN;
        const parsed = Number(trimmed);
        return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
      },
      z
        .number({ error: "Hedef için 1 veya daha büyük bir tam sayı yaz." })
        .int("Hedef için 1 veya daha büyük bir tam sayı yaz.")
        .min(1, "Hedef en az 1 soru olmalı.")
        .max(
          STUDY_LIMITS.goalQuestions,
          `Hedef en fazla ${STUDY_LIMITS.goalQuestions} soru olabilir.`,
        ),
    ),
  });
}

export type StudyLogInput = z.infer<ReturnType<typeof studyLogSchema>>;
export type StudyGoalInput = z.infer<ReturnType<typeof studyGoalSchema>>;
