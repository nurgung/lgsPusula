/**
 * Exam types and net rules (decision 0.7). Question counts live only here so a new
 * MEB guide can add `lgs-v2` without scattering numbers across the app. Old exams keep
 * the rule version stored on their row.
 */

export type ExamType = "lgs_full" | "branch";

export type NetRuleVersion = "lgs-v1";

/** Catalog `subjects.code` values used by the LGS full paper. */
export type LgsSubjectCode =
  | "turkce"
  | "matematik"
  | "fen_bilimleri"
  | "inkilap_tarihi"
  | "din_kulturu"
  | "ingilizce";

export type LgsSubjectSlot = {
  code: LgsSubjectCode;
  questionCount: number;
};

export type NetRule = {
  version: NetRuleVersion;
  /** Per-subject: net = doğru − (yanlış ÷ 3). Blank does not change the net. */
  examTypes: {
    lgs_full: { subjects: readonly LgsSubjectSlot[] };
    branch: { minQuestions: number; maxQuestions: number };
  };
};

export const CURRENT_RULE_VERSION: NetRuleVersion = "lgs-v1";

export const NET_RULES: Record<NetRuleVersion, NetRule> = {
  "lgs-v1": {
    version: "lgs-v1",
    examTypes: {
      lgs_full: {
        subjects: [
          { code: "turkce", questionCount: 20 },
          { code: "matematik", questionCount: 20 },
          { code: "fen_bilimleri", questionCount: 20 },
          { code: "inkilap_tarihi", questionCount: 10 },
          { code: "din_kulturu", questionCount: 10 },
          { code: "ingilizce", questionCount: 10 },
        ],
      },
      branch: { minQuestions: 1, maxQuestions: 100 },
    },
  },
};

export function getNetRule(version: NetRuleVersion): NetRule {
  return NET_RULES[version];
}

export function isNetRuleVersion(value: string): value is NetRuleVersion {
  return value in NET_RULES;
}

export function isExamType(value: string): value is ExamType {
  return value === "lgs_full" || value === "branch";
}

/** Subject net may be negative (decision 0.7). */
export function computeSubjectNet(correctCount: number, wrongCount: number): number {
  return correctCount - wrongCount / 3;
}

/**
 * Sum of subject nets. If the sum is negative, the stored/shown total is 0.
 * Subject nets themselves stay negative when that is the case.
 */
export function computeTotalNet(subjectNets: readonly number[]): number {
  const sum = subjectNets.reduce((total, net) => total + net, 0);
  return sum < 0 ? 0 : sum;
}

export type SubjectCountInput = {
  subjectCode: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
};

export type ComputedSubjectNet = {
  subjectCode: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  net: number;
};

export type ComputedExamNets = {
  ruleVersion: NetRuleVersion;
  subjects: ComputedSubjectNet[];
  totalNet: number;
};

/**
 * Single entry point for net calculation. Callers pass the rule version that was (or
 * will be) stored with the exam so historical papers stay on their original rule.
 */
export function computeExamNets(
  examType: ExamType,
  ruleVersion: NetRuleVersion,
  subjects: readonly SubjectCountInput[],
): ComputedExamNets {
  const rule = getNetRule(ruleVersion);
  if (examType === "lgs_full") {
    const expected = rule.examTypes.lgs_full.subjects;
    if (subjects.length !== expected.length) {
      throw new Error("lgs_full requires every subject slot");
    }
    const byCode = new Map(subjects.map((row) => [row.subjectCode, row]));
    const ordered: ComputedSubjectNet[] = expected.map((slot) => {
      const row = byCode.get(slot.code);
      if (!row) throw new Error(`missing subject ${slot.code}`);
      if (row.questionCount !== slot.questionCount) {
        throw new Error(`question count for ${slot.code} must be ${slot.questionCount}`);
      }
      return {
        subjectCode: row.subjectCode,
        questionCount: row.questionCount,
        correctCount: row.correctCount,
        wrongCount: row.wrongCount,
        blankCount: row.blankCount,
        net: computeSubjectNet(row.correctCount, row.wrongCount),
      };
    });
    return {
      ruleVersion,
      subjects: ordered,
      totalNet: computeTotalNet(ordered.map((row) => row.net)),
    };
  }

  if (subjects.length !== 1) {
    throw new Error("branch requires exactly one subject");
  }
  const row = subjects[0]!;
  const { minQuestions, maxQuestions } = rule.examTypes.branch;
  if (row.questionCount < minQuestions || row.questionCount > maxQuestions) {
    throw new Error(`branch question count must be ${minQuestions}–${maxQuestions}`);
  }
  const net = computeSubjectNet(row.correctCount, row.wrongCount);
  return {
    ruleVersion,
    subjects: [
      {
        subjectCode: row.subjectCode,
        questionCount: row.questionCount,
        correctCount: row.correctCount,
        wrongCount: row.wrongCount,
        blankCount: row.blankCount,
        net,
      },
    ],
    totalNet: computeTotalNet([net]),
  };
}

/** Two decimal places for the student UI (decision 0.7). */
export function formatNet(value: number): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Optional exam booklet score. Null means the student did not record one. */
export function formatExamScore(value: number | null): string {
  if (value === null) return "Kayıt yok";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
