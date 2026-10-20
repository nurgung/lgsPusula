/**
 * Outcome prioritisation rule `outcome-priority-v1`.
 *
 * Only mistakes that the student (or a later import source) explicitly tagged to a
 * learning outcome count. Wrong/blank totals on an exam alone never invent a priority —
 * that would look like "kazanım tespiti" without mapping data (decision 0.6 / Faz 8).
 *
 * Score per tagged mistake: wrong = 2, blank = 1. Higher score first; ties break by
 * most recent exam date, then outcome code.
 */

export const OUTCOME_PRIORITY_RULE_VERSION = "outcome-priority-v1" as const;

export type MistakeKind = "wrong" | "blank";

export type PrioritisableMistake = {
  outcomeId: string;
  outcomeCode: string;
  outcomeDescription: string;
  subjectId: string;
  subjectName: string;
  kind: MistakeKind;
  /** Europe/Istanbul civil date of the exam the mistake belongs to. */
  takenOn: string;
};

export type OutcomePriority = {
  outcomeId: string;
  outcomeCode: string;
  outcomeDescription: string;
  subjectId: string;
  subjectName: string;
  score: number;
  wrongCount: number;
  blankCount: number;
  lastTakenOn: string;
  ruleVersion: typeof OUTCOME_PRIORITY_RULE_VERSION;
};

export type PrioritiseEmptyReason =
  "no_mistakes" | "no_outcomes_in_window" | "insufficient_exams_for_trend";

const KIND_WEIGHT: Record<MistakeKind, number> = {
  wrong: 2,
  blank: 1,
};

export function mistakeWeight(kind: MistakeKind): number {
  return KIND_WEIGHT[kind];
}

/**
 * Builds a ranked list from explicitly tagged mistakes only.
 * Returns an empty array when nothing was tagged — callers must show an empty state,
 * not a fabricated ranking.
 */
export function prioritiseOutcomes(
  mistakes: readonly PrioritisableMistake[],
): OutcomePriority[] {
  const byOutcome = new Map<
    string,
    {
      outcomeId: string;
      outcomeCode: string;
      outcomeDescription: string;
      subjectId: string;
      subjectName: string;
      score: number;
      wrongCount: number;
      blankCount: number;
      lastTakenOn: string;
    }
  >();

  for (const mistake of mistakes) {
    const existing = byOutcome.get(mistake.outcomeId);
    const weight = mistakeWeight(mistake.kind);
    if (!existing) {
      byOutcome.set(mistake.outcomeId, {
        outcomeId: mistake.outcomeId,
        outcomeCode: mistake.outcomeCode,
        outcomeDescription: mistake.outcomeDescription,
        subjectId: mistake.subjectId,
        subjectName: mistake.subjectName,
        score: weight,
        wrongCount: mistake.kind === "wrong" ? 1 : 0,
        blankCount: mistake.kind === "blank" ? 1 : 0,
        lastTakenOn: mistake.takenOn,
      });
      continue;
    }
    existing.score += weight;
    if (mistake.kind === "wrong") existing.wrongCount += 1;
    else existing.blankCount += 1;
    if (mistake.takenOn > existing.lastTakenOn) existing.lastTakenOn = mistake.takenOn;
  }

  return [...byOutcome.values()]
    .map((row) => ({ ...row, ruleVersion: OUTCOME_PRIORITY_RULE_VERSION }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.lastTakenOn.localeCompare(a.lastTakenOn) ||
        a.outcomeCode.localeCompare(b.outcomeCode, "tr"),
    );
}

/** Trend chart needs at least two exam points in the window. */
export function canShowNetTrend(examCount: number): boolean {
  return examCount >= 2;
}
