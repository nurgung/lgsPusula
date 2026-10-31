import { z } from "zod";
import { isRealIsoDate, STUDY_DATE_MIN } from "@/features/study/calendar";
import {
  CURRENT_RULE_VERSION,
  getNetRule,
  type ExamType,
  type LgsSubjectCode,
  type NetRuleVersion,
} from "./net-rules";

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

export const examRequestSchema = z.uuid(
  "Kayıt gönderilemedi. Sayfayı yenileyip tekrar dene.",
);

export type SubjectCountFields = {
  subjectCode: string;
  subjectId: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
};

export type ParsedExamInput = {
  title: string;
  takenOn: string;
  examType: ExamType;
  ruleVersion: NetRuleVersion;
  /** Optional booklet score; null when the student left the field blank. */
  score: number | null;
  subjects: SubjectCountFields[];
};

export const EXAM_SCORE_MAX = 500;

/** Empty → null. Accepts `.` or `,` with up to 3 fraction digits. Does not invent a score from nets. */
export function parseOptionalExamScore(
  raw: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  const normalized = trimmed.replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) {
    return {
      ok: false,
      message:
        "Puan için 0–500 arası bir sayı yaz (virgülle en fazla 3 basamak) veya boş bırak.",
    };
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > EXAM_SCORE_MAX) {
    return {
      ok: false,
      message: `Puan 0–${EXAM_SCORE_MAX} arasında olmalı veya boş bırakılmalı.`,
    };
  }
  return { ok: true, value };
}

export type ExamParseResult =
  | { ok: true; data: ParsedExamInput }
  | { ok: false; fieldErrors: Record<string, string> };

function readCounts(
  prefix: string,
  values: Record<string, string>,
  maxQuestions: number,
  label: string,
  fieldErrors: Record<string, string>,
  fixedQuestionCount?: number,
): Omit<SubjectCountFields, "subjectCode" | "subjectId"> & { subjectId: string } | null {
  const questionRaw =
    fixedQuestionCount !== undefined
      ? String(fixedQuestionCount)
      : (values[`${prefix}.questionCount`] ?? "");
  const question = wholeNumber(`${label} soru sayısı`, maxQuestions).safeParse(questionRaw);
  const correct = wholeNumber(`${label} doğru`, maxQuestions).safeParse(
    values[`${prefix}.correctCount`] ?? "",
  );
  const wrong = wholeNumber(`${label} yanlış`, maxQuestions).safeParse(
    values[`${prefix}.wrongCount`] ?? "",
  );
  const blank = wholeNumber(`${label} boş`, maxQuestions).safeParse(
    values[`${prefix}.blankCount`] ?? "",
  );
  const subjectId = z
    .uuid("Dersi listeden seç.")
    .safeParse((values[`${prefix}.subjectId`] ?? "").trim());

  let failed = false;
  if (!question.success) {
    failed = true;
    fieldErrors[`${prefix}.questionCount`] =
      question.error.issues[0]?.message ?? "Soru sayısını kontrol et.";
  } else if (question.data < 1) {
    failed = true;
    fieldErrors[`${prefix}.questionCount`] = "En az 1 soru yaz.";
  }
  if (!correct.success) {
    failed = true;
    fieldErrors[`${prefix}.correctCount`] =
      correct.error.issues[0]?.message ?? "Doğruyu kontrol et.";
  }
  if (!wrong.success) {
    failed = true;
    fieldErrors[`${prefix}.wrongCount`] =
      wrong.error.issues[0]?.message ?? "Yanlışı kontrol et.";
  }
  if (!blank.success) {
    failed = true;
    fieldErrors[`${prefix}.blankCount`] =
      blank.error.issues[0]?.message ?? "Boşu kontrol et.";
  }
  if (!subjectId.success) {
    failed = true;
    fieldErrors[`${prefix}.subjectId`] =
      subjectId.error.issues[0]?.message ?? "Dersi listeden seç.";
  }
  if (
    failed ||
    !question.success ||
    !correct.success ||
    !wrong.success ||
    !blank.success ||
    !subjectId.success
  ) {
    return null;
  }
  if (correct.data + wrong.data + blank.data !== question.data) {
    fieldErrors[`${prefix}.questionCount`] =
      "Doğru, yanlış ve boş toplamı soru sayısına eşit olmalı.";
    return null;
  }
  return {
    subjectId: subjectId.data,
    questionCount: question.data,
    correctCount: correct.data,
    wrongCount: wrong.data,
    blankCount: blank.data,
  };
}

/**
 * Shared create/edit rules. `today` is the Europe/Istanbul civil date.
 * Full LGS slots bind subject ids from the catalog map, not from the client alone.
 */
export function parseExamInput(
  values: Record<string, string>,
  today: string,
  subjectIdsByCode: ReadonlyMap<string, string>,
  ruleVersion: NetRuleVersion = CURRENT_RULE_VERSION,
): ExamParseResult {
  const fieldErrors: Record<string, string> = {};
  const rule = getNetRule(ruleVersion);

  const title = z
    .string({ error: "Deneme adına bir şey yaz." })
    .trim()
    .min(1, "Deneme adına bir şey yaz.")
    .max(80, "Deneme adı en fazla 80 karakter olabilir.")
    .safeParse(values.title ?? "");
  if (!title.success) {
    fieldErrors.title = title.error.issues[0]?.message ?? "Deneme adına bir şey yaz.";
  }

  const takenOnRaw = (values.takenOn ?? "").trim();
  if (!isRealIsoDate(takenOnRaw)) {
    fieldErrors.takenOn = "Tarihi seç.";
  } else if (takenOnRaw < STUDY_DATE_MIN) {
    fieldErrors.takenOn = "Bu tarih çok eski. Daha yeni bir gün seç.";
  } else if (takenOnRaw > today) {
    fieldErrors.takenOn = "İleri bir tarih seçilemez.";
  }

  const examTypeRaw = (values.examType ?? "").trim();
  if (examTypeRaw !== "lgs_full" && examTypeRaw !== "branch") {
    fieldErrors.examType = "Deneme türünü seç.";
  }

  const scoreParsed = parseOptionalExamScore(values.score ?? "");
  if (!scoreParsed.ok) {
    fieldErrors.score = scoreParsed.message;
  }

  if (Object.keys(fieldErrors).length > 0 || !title.success || !scoreParsed.ok) {
    return { ok: false, fieldErrors };
  }

  const examType = examTypeRaw as ExamType;
  const score = scoreParsed.value;

  if (examType === "lgs_full") {
    const subjects: SubjectCountFields[] = [];
    for (const slot of rule.examTypes.lgs_full.subjects) {
      const subjectId = subjectIdsByCode.get(slot.code);
      if (!subjectId) {
        return {
          ok: false,
          fieldErrors: {
            examType: "Deneme dersleri henüz hazır değil. Biraz sonra tekrar dene.",
          },
        };
      }
      const parsed = readCounts(
        slot.code,
        { ...values, [`${slot.code}.subjectId`]: subjectId },
        slot.questionCount,
        slot.code,
        fieldErrors,
        slot.questionCount,
      );
      if (!parsed) continue;
      subjects.push({ subjectCode: slot.code, ...parsed });
    }
    if (Object.keys(fieldErrors).length > 0 || subjects.length !== rule.examTypes.lgs_full.subjects.length) {
      return { ok: false, fieldErrors };
    }
    return {
      ok: true,
      data: {
        title: title.data,
        takenOn: takenOnRaw,
        examType,
        ruleVersion,
        score,
        subjects,
      },
    };
  }

  const branch = rule.examTypes.branch;
  const parsed = readCounts(
    "branch",
    values,
    branch.maxQuestions,
    "branş",
    fieldErrors,
  );
  if (!parsed || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  if (
    parsed.questionCount < branch.minQuestions ||
    parsed.questionCount > branch.maxQuestions
  ) {
    fieldErrors["branch.questionCount"] =
      `Soru sayısı ${branch.minQuestions}–${branch.maxQuestions} arasında olmalı.`;
    return { ok: false, fieldErrors };
  }
  const codeEntry = [...subjectIdsByCode.entries()].find(
    ([, id]) => id === parsed.subjectId,
  );
  if (!codeEntry) {
    fieldErrors["branch.subjectId"] = "Dersi listeden seç.";
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    data: {
      title: title.data,
      takenOn: takenOnRaw,
      examType,
      ruleVersion,
      score,
      subjects: [{ subjectCode: codeEntry[0], ...parsed }],
    },
  };
}

export const LGS_SUBJECT_CODES: readonly LgsSubjectCode[] = getNetRule(
  CURRENT_RULE_VERSION,
).examTypes.lgs_full.subjects.map((slot) => slot.code);
