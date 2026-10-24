import { describe, expect, it } from "vitest";
import { formatNet } from "@/features/exams/net-rules";
import { OUTCOME_PRIORITY_RULE_VERSION } from "@/features/outcomes/prioritize";
import type { PrioritisableMistake } from "@/features/outcomes/prioritize";
import { addCalendarDays, formatTurkishDate } from "@/features/study/calendar";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";
import { COACHING_RULE_VERSION } from "./constants";
import {
  COACHING_MESSAGES,
  examNetDownMessage,
  examNetDownReason,
  goalRemainingMessage,
  goalRemainingReason,
  holdMessage,
  holdReason,
  practiceSubjectMessage,
  practiceSubjectReason,
  repeatOutcomeMessage,
  repeatOutcomeReason,
  suggestGoalMessage,
  suggestGoalReason,
  supportiveCopyIssues,
} from "./messages";
import {
  acceptedPractice,
  buildCoachingReport,
  COACHING_RULES,
  type CoachingInput,
  type CoachingReport,
} from "./rules";

const today = "2026-10-20";

function log(partial: Partial<StudyLogView> & Pick<StudyLogView, "id">): StudyLogView {
  return {
    studiedOn: today,
    subjectId: "sub-mat",
    subjectName: "Matematik",
    topicId: null,
    topicName: null,
    outcomeId: null,
    outcomeCode: null,
    questionCount: 10,
    correctCount: 2,
    wrongCount: 8,
    blankCount: 0,
    durationMinutes: 20,
    ...partial,
  };
}

function goal(
  partial: Partial<StudyGoalView> & Pick<StudyGoalView, "id" | "targetQuestions">,
): StudyGoalView {
  return {
    period: "day",
    subjectId: null,
    subjectName: null,
    ...partial,
  };
}

function mistake(
  partial: Partial<PrioritisableMistake> &
    Pick<PrioritisableMistake, "outcomeId" | "outcomeCode" | "kind" | "takenOn">,
): PrioritisableMistake {
  return {
    outcomeDescription: "Örnek kazanım",
    subjectId: "sub-mat",
    subjectName: "Matematik",
    ...partial,
  };
}

function input(partial: Partial<CoachingInput> = {}): CoachingInput {
  return { today, logs: [], goals: [], exams: [], mistakes: [], ...partial };
}

function report(partial: Partial<CoachingInput> = {}): CoachingReport {
  return buildCoachingReport(input(partial));
}

function spoken(item: CoachingReport): string {
  return [
    item.recommendation.message,
    item.recommendation.reason,
    ...item.recommendation.evidence,
  ].join("\n");
}

describe("coaching copy", () => {
  it("keeps reviewed templates free of shame, fear, and comparison", () => {
    const samples = [
      ...Object.values(COACHING_MESSAGES),
      repeatOutcomeMessage({
        subjectName: "Matematik",
        code: "M.8.1.1",
        description: "Üslü ifadelerle işlem yapar.",
        questionCount: 4,
      }),
      repeatOutcomeReason(),
      practiceSubjectMessage({
        subjectName: "Matematik",
        window: { from: "2026-10-07", to: today },
        questionCount: 10,
        correctCount: 2,
      }),
      practiceSubjectReason(),
      examNetDownMessage({
        earlierNet: 40,
        laterNet: 36.5,
        earlierOn: "2026-10-01",
        laterOn: "2026-10-18",
      }),
      examNetDownReason(),
      goalRemainingMessage({ target: 20, done: 4, remaining: 16, scope: "tüm dersler" }),
      goalRemainingReason(today),
      suggestGoalMessage(),
      suggestGoalReason(today),
      holdMessage(),
      holdReason(),
    ];
    for (const text of samples) {
      expect(supportiveCopyIssues(text)).toEqual([]);
      expect(text.includes("!")).toBe(false);
    }
  });
});

describe("buildCoachingReport", () => {
  it("invites a goal when there is no academic evidence", () => {
    const result = report();
    expect(result.ruleVersion).toBe(COACHING_RULE_VERSION);
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.suggestGoal);
    expect(result.recommendation.ruleVersion).toBe(COACHING_RULE_VERSION);
    expect(result.recommendation.href).toBe("/ogrenci/hedefler");
    expect(spoken(result)).toContain(formatTurkishDate(today));
    expect(spoken(result)).not.toContain("doğruydu");
    expect(spoken(result)).not.toContain("toplam net");
    expect(spoken(result)).not.toContain("%");
    expect(supportiveCopyIssues(spoken(result))).toEqual([]);
  });

  it("does not state a subject rate from fewer than 10 questions", () => {
    const result = report({
      logs: [log({ id: "thin", questionCount: 9, correctCount: 0, wrongCount: 9 })],
    });
    expect(result.metrics.subjectAccuracy[0]).toMatchObject({
      sufficient: false,
      correctShare: null,
      questionCount: 9,
    });
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.suggestGoal);
    expect(spoken(result)).not.toContain("Matematik");
    expect(spoken(result)).not.toContain("%");
  });

  it("suggests a subject only from enough questions and a low correct count", () => {
    const result = report({
      logs: [log({ id: "low", questionCount: 10, correctCount: 2, wrongCount: 8 })],
    });
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.practiceSubject);
    expect(result.recommendation.message).toContain("Matematik");
    expect(result.recommendation.message).toContain("10 sorudan 2 tanesi doğruydu");
    expect(result.recommendation.evidence.join("\n")).toContain("2 doğru / 10 soru");
    expect(result.recommendation.reason).toContain(COACHING_RULE_VERSION);
    expect(supportiveCopyIssues(spoken(result))).toEqual([]);
  });

  it("does not treat exactly half correct as a problem", () => {
    const result = report({
      logs: [log({ id: "half", questionCount: 10, correctCount: 5, wrongCount: 5 })],
    });
    expect(result.metrics.subjectAccuracy[0]?.correctShare).toBe(0.5);
    expect(result.recommendation.ruleId).not.toBe(COACHING_RULES.practiceSubject);
  });

  it("picks the lower correct share, then the larger sample", () => {
    const lower = report({
      logs: [
        log({
          id: "mat",
          subjectId: "sub-mat",
          subjectName: "Matematik",
          correctCount: 2,
        }),
        log({
          id: "fen",
          subjectId: "sub-fen",
          subjectName: "Fen",
          questionCount: 20,
          correctCount: 3,
          wrongCount: 17,
        }),
      ],
    });
    expect(lower.recommendation.message).toContain("Fen");

    const larger = report({
      logs: [
        log({ id: "mat", correctCount: 2, questionCount: 10, wrongCount: 8 }),
        log({
          id: "fen",
          subjectId: "sub-fen",
          subjectName: "Fen",
          questionCount: 20,
          correctCount: 4,
          wrongCount: 16,
        }),
      ],
    });
    expect(larger.recommendation.message).toContain("Fen");
  });

  it("ignores practice rows outside the 14-day window", () => {
    const result = report({
      logs: [
        log({
          id: "old",
          studiedOn: "2026-01-01",
          questionCount: 10,
          correctCount: 0,
          wrongCount: 10,
        }),
      ],
    });
    expect(result.metrics.subjectAccuracy).toEqual([]);
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.suggestGoal);
  });

  it("repeats a tagged outcome and does not invent one from an untagged exam", () => {
    const tagged = report({
      logs: [log({ id: "low" })],
      goals: [goal({ id: "day", targetQuestions: 30 })],
      mistakes: [
        mistake({
          outcomeId: "out-1",
          outcomeCode: "M.8.1.2",
          kind: "wrong",
          takenOn: "2026-10-18",
        }),
        mistake({
          outcomeId: "out-1",
          outcomeCode: "M.8.1.2",
          kind: "blank",
          takenOn: "2026-10-10",
        }),
      ],
    });
    expect(tagged.recommendation.ruleId).toBe(COACHING_RULES.repeatOutcome);
    expect(tagged.recommendation.message).toContain("Matematik dersinde M.8.1.2");
    expect(tagged.recommendation.message).toContain("Örnek kazanım");
    expect(tagged.recommendation.message).toContain("2 soru çöz");
    expect(tagged.recommendation.practice).toEqual({
      outcomeId: "out-1",
      questionCount: 2,
    });
    expect(tagged.recommendation.reason).toContain(OUTCOME_PRIORITY_RULE_VERSION);
    expect(tagged.recommendation.reason).toContain(COACHING_RULE_VERSION);
    expect(tagged.recommendation.evidence.join("\n")).toContain("1 yanlış, 1 boş");
    expect(tagged.metrics.reviewOutcomes[0]?.ruleVersion).toBe(
      OUTCOME_PRIORITY_RULE_VERSION,
    );
    expect(supportiveCopyIssues(spoken(tagged))).toEqual([]);

    const untagged = report({
      exams: [
        {
          id: "exam-1",
          title: "Deneme A",
          takenOn: "2026-10-18",
          examType: "lgs_full",
          totalNet: 40,
        },
      ],
    });
    expect(untagged.metrics.reviewOutcomes).toEqual([]);
    expect(untagged.recommendation.ruleId).not.toBe(COACHING_RULES.repeatOutcome);
    expect(spoken(untagged)).not.toContain("M.8");
  });

  it("moves to the next outcome after the current question count is marked done", () => {
    const mistakes = [
      mistake({
        outcomeId: "out-high",
        outcomeCode: "F.8.1.1.1",
        kind: "wrong",
        takenOn: "2026-10-18",
        subjectName: "Fen Bilimleri",
      }),
      mistake({
        outcomeId: "out-next",
        outcomeCode: "T.8.3.13",
        kind: "blank",
        takenOn: "2026-10-16",
        subjectName: "Türkçe",
        outcomeDescription: "Okuduklarını özetler.",
      }),
    ];
    const open = report({ mistakes });
    expect(open.recommendation.practice?.outcomeId).toBe("out-high");

    const done = report({
      mistakes,
      completions: [{ outcomeId: "out-high", questionCount: 1 }],
    });
    expect(done.recommendation.practice).toEqual({
      outcomeId: "out-next",
      questionCount: 1,
    });
    expect(done.recommendation.message).toContain("Türkçe dersinde T.8.3.13");
    expect(done.recommendation.message).toContain("Okuduklarını özetler");
  });

  it("asks again when new linked questions exceed the completed count", () => {
    const mistakes = [
      mistake({
        outcomeId: "out-1",
        outcomeCode: "F.8.1.1.1",
        kind: "wrong",
        takenOn: "2026-10-18",
      }),
      mistake({
        outcomeId: "out-1",
        outcomeCode: "F.8.1.1.1",
        kind: "wrong",
        takenOn: "2026-10-19",
      }),
    ];
    const stillDone = report({
      mistakes: [mistakes[0]!],
      completions: [{ outcomeId: "out-1", questionCount: 1 }],
    });
    expect(stillDone.recommendation.practice).toBeNull();

    const again = report({
      mistakes,
      completions: [{ outcomeId: "out-1", questionCount: 1 }],
    });
    expect(again.recommendation.practice).toEqual({
      outcomeId: "out-1",
      questionCount: 2,
    });
    expect(acceptedPractice(again, "out-1")?.questionCount).toBe(2);
    expect(acceptedPractice(again, "out-other")).toBeNull();
  });

  it("ignores a tagged mistake outside the 90-day window", () => {
    const result = report({
      mistakes: [
        mistake({
          outcomeId: "out-old",
          outcomeCode: "F.8.1.1",
          kind: "wrong",
          takenOn: addCalendarDays(today, -120),
        }),
      ],
    });
    expect(result.metrics.reviewOutcomes).toEqual([]);
    expect(spoken(result)).not.toContain("F.8.1.1");
  });

  it("compares only the last two full LGS papers when the later net is lower", () => {
    const result = report({
      exams: [
        {
          id: "e1",
          title: "Eski",
          takenOn: "2026-10-01",
          examType: "lgs_full",
          totalNet: 10,
        },
        {
          id: "e2",
          title: "Orta",
          takenOn: "2026-10-10",
          examType: "lgs_full",
          totalNet: 30,
        },
        {
          id: "e3",
          title: "Son",
          takenOn: "2026-10-18",
          examType: "lgs_full",
          totalNet: 20,
        },
        {
          id: "branch",
          title: "Tek ders denemesi",
          takenOn: "2026-10-19",
          examType: "branch",
          totalNet: 1,
        },
      ],
    });
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.examNetDown);
    expect(result.metrics.examChange).toMatchObject({
      sufficient: true,
      delta: -10,
    });
    const text = spoken(result);
    expect(text).toContain("Orta");
    expect(text).toContain("Son");
    expect(text).toContain(formatNet(30));
    expect(text).toContain(formatNet(20));
    expect(text).not.toContain("Eski");
    expect(text).not.toContain("Tek ders denemesi");
    expect(supportiveCopyIssues(text)).toEqual([]);
  });

  it("does not claim a net change from branch papers, one full paper, or a higher later net", () => {
    const branch = report({
      exams: [
        {
          id: "b1",
          title: "Branş 1",
          takenOn: "2026-10-01",
          examType: "branch",
          totalNet: 20,
        },
        {
          id: "b2",
          title: "Branş 2",
          takenOn: "2026-10-18",
          examType: "branch",
          totalNet: 5,
        },
      ],
    });
    expect(branch.metrics.examChange).toEqual({ sufficient: false, fullExamCount: 0 });
    expect(spoken(branch)).not.toContain("toplam net");

    const single = report({
      exams: [
        {
          id: "only",
          title: "Tek",
          takenOn: "2026-10-18",
          examType: "lgs_full",
          totalNet: 10,
        },
      ],
    });
    expect(single.metrics.examChange).toEqual({ sufficient: false, fullExamCount: 1 });
    expect(spoken(single)).not.toContain("toplam net");

    const up = report({
      exams: [
        {
          id: "u1",
          title: "İlk",
          takenOn: "2026-10-01",
          examType: "lgs_full",
          totalNet: 20,
        },
        {
          id: "u2",
          title: "Sonra",
          takenOn: "2026-10-18",
          examType: "lgs_full",
          totalNet: 25,
        },
      ],
    });
    expect(up.recommendation.ruleId).not.toBe(COACHING_RULES.examNetDown);
    expect(spoken(up)).not.toContain("toplam net");
  });

  it("counts today's goal from today's questions and prefers the larger gap", () => {
    const result = report({
      logs: [
        log({
          id: "today",
          questionCount: 4,
          correctCount: 4,
          wrongCount: 0,
          subjectId: "sub-mat",
          subjectName: "Matematik",
        }),
      ],
      goals: [
        goal({ id: "all", targetQuestions: 20 }),
        goal({
          id: "mat",
          targetQuestions: 12,
          subjectId: "sub-mat",
          subjectName: "Matematik",
        }),
      ],
    });
    const all = result.metrics.goals.find((item) => item.goalId === "all");
    expect(all).toMatchObject({ doneQuestions: 4, remainingQuestions: 16, met: false });
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.goalRemaining);
    expect(result.recommendation.message).toContain("tüm dersler");
    expect(result.recommendation.evidence.join("\n")).toContain("4 / 20 soru");
    expect(result.recommendation.evidence.join("\n")).toContain("Kalan: 16 soru");
  });

  it("uses the all-subjects goal when the remaining counts are equal", () => {
    const result = report({
      logs: [log({ id: "today", questionCount: 10, correctCount: 10, wrongCount: 0 })],
      goals: [
        goal({ id: "all", targetQuestions: 20 }),
        goal({
          id: "mat",
          targetQuestions: 20,
          subjectId: "sub-mat",
          subjectName: "Matematik",
        }),
      ],
    });
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.goalRemaining);
    expect(result.recommendation.message).toContain("tüm dersler");
  });

  it("does not turn a weekly goal into today's suggestion", () => {
    const result = report({
      goals: [goal({ id: "week", period: "week", targetQuestions: 100 })],
    });
    expect(result.metrics.goals[0]).toMatchObject({ period: "week", met: false });
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.suggestGoal);
  });

  it("holds back when the daily goal is met and no repeat rule matches", () => {
    const result = report({
      logs: [log({ id: "done", questionCount: 10, correctCount: 8, wrongCount: 2 })],
      goals: [goal({ id: "day", targetQuestions: 10 })],
      exams: [
        {
          id: "u1",
          title: "İlk",
          takenOn: "2026-10-01",
          examType: "lgs_full",
          totalNet: 20,
        },
        {
          id: "u2",
          title: "Sonra",
          takenOn: "2026-10-18",
          examType: "lgs_full",
          totalNet: 25,
        },
      ],
    });
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.hold);
    expect(result.recommendation.href).toBeNull();
    const text = spoken(result);
    expect(text).toContain("Bugünkü hedef tamam.");
    expect(text).toContain("toplam net azalmadı");
    expect(text).not.toContain("Matematik");
    expect(text).not.toContain("%");
    expect(supportiveCopyIssues(text)).toEqual([]);
  });

  it("does not name a subject when the sample is too small to judge", () => {
    const result = report({
      logs: [log({ id: "few", questionCount: 3, correctCount: 3, wrongCount: 0 })],
      goals: [goal({ id: "day", targetQuestions: 3 })],
    });
    expect(result.recommendation.ruleId).toBe(COACHING_RULES.hold);
    expect(spoken(result)).not.toContain("Matematik");
    expect(spoken(result)).toContain("10 sorudan az");
  });
});
