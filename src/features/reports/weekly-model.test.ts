import { describe, expect, it } from "vitest";
import { supportiveCopyIssues } from "@/features/coaching/messages";
import type { OutcomePriority } from "@/features/outcomes/prioritize";
import type { StudyGoalView, StudyLogView } from "@/features/study/summary";
import {
  buildWeeklyReportModel,
  formatDurationMinutes,
  formatNetDelta,
  type ReportExam,
} from "./weekly-model";

const today = "2026-10-21";

function log(partial: Partial<StudyLogView> & Pick<StudyLogView, "id" | "studiedOn">): StudyLogView {
  return {
    subjectId: "sub-1",
    subjectName: "Türkçe",
    topicId: null,
    topicName: null,
    outcomeId: null,
    outcomeCode: null,
    questionCount: 4,
    correctCount: 3,
    wrongCount: 1,
    blankCount: 0,
    durationMinutes: 20,
    ...partial,
  };
}

const suggestion = {
  message: "Bugün için küçük bir soru hedefi belirleyebilirsin.",
  reason: "Bu bir ders sonucu değil.",
  evidence: ["Kayıt yok."],
};

describe("buildWeeklyReportModel", () => {
  it("merges same-day same-subject logs and counts unique study days", () => {
    const model = buildWeeklyReportModel({
      studentName: "Ayşe",
      generatedAt: new Date("2026-10-21T07:55:00.000Z"),
      period: "current",
      today,
      logs: [
        log({ id: "a", studiedOn: "2026-10-19" }),
        log({
          id: "a2",
          studiedOn: "2026-10-19",
          questionCount: 2,
          correctCount: 1,
          wrongCount: 1,
          blankCount: 0,
          durationMinutes: 10,
        }),
        log({
          id: "b",
          studiedOn: "2026-10-19",
          subjectId: "sub-2",
          subjectName: "Matematik",
          questionCount: 6,
          correctCount: 4,
          wrongCount: 1,
          blankCount: 1,
          durationMinutes: 30,
        }),
        log({ id: "c", studiedOn: "2026-10-21", questionCount: 2, durationMinutes: 10 }),
        log({ id: "outside", studiedOn: "2026-10-13", questionCount: 50, durationMinutes: 100 }),
      ],
      goals: [],
      exams: [],
      suggestion,
    });
    expect(model.summary).toEqual({
      durationMinutes: 70,
      questionCount: 14,
      correctCount: 11,
      wrongCount: 4,
      blankCount: 1,
      studyDayCount: 2,
      examCount: 0,
      lastExamTotalNet: null,
    });
    expect(model.studyRows).toHaveLength(3);
    const turkce = model.studyRows.find(
      (row) => row.studiedOn === "2026-10-19" && row.subjectName === "Türkçe",
    );
    expect(turkce).toMatchObject({
      dayName: "Pazartesi",
      questionCount: 6,
      correctCount: 4,
      wrongCount: 2,
      durationMinutes: 30,
    });
    expect(model.subjectRows.map((row) => row.subjectName)).toEqual([
      "Matematik",
      "Türkçe",
    ]);
    expect(model.evaluation.join("\n")).toContain("Matematik");
    expect(supportiveCopyIssues(model.evaluation.join("\n"))).toEqual([]);
  });

  it("compares the last two exams by date and leaves missing nets blank", () => {
    const exams: ReportExam[] = [
      {
        title: "Birinci",
        takenOn: "2026-10-19",
        examType: "lgs_full",
        totalNet: 30,
        score: 400,
        ruleVersion: "lgs-v1",
        subjects: [
          { subjectCode: "turkce", subjectName: "Türkçe", net: 10 },
          { subjectCode: "matematik", subjectName: "Matematik", net: 8 },
        ],
      },
      {
        title: "İkinci",
        takenOn: "2026-10-21",
        examType: "lgs_full",
        totalNet: 33,
        score: null,
        ruleVersion: "lgs-v1",
        subjects: [
          { subjectCode: "turkce", subjectName: "Türkçe", net: 12 },
          { subjectCode: "matematik", subjectName: "Matematik", net: 6 },
          { subjectCode: "fen_bilimleri", subjectName: "Fen Bilimleri", net: 15 },
        ],
      },
    ];
    const outcomes: OutcomePriority[] = [
      {
        outcomeId: "out-1",
        outcomeCode: "M.8.1.1",
        outcomeDescription: "Doğal sayılarla işlemler",
        subjectId: "sub-2",
        subjectName: "Matematik",
        score: 4,
        wrongCount: 2,
        blankCount: 0,
        lastTakenOn: "2026-10-21",
        ruleVersion: "outcome-priority-v1",
      },
    ];
    const model = buildWeeklyReportModel({
      studentName: "Ayşe",
      generatedAt: new Date("2026-10-21T07:55:00.000Z"),
      period: "current",
      today,
      logs: [],
      goals: [],
      exams,
      outcomes,
      suggestion,
    });
    expect(model.summary.examCount).toBe(2);
    expect(model.summary.lastExamTotalNet).toBe(33);
    expect(model.canCompareExams).toBe(true);
    expect(model.examsInPeriod.map((exam) => exam.title)).toEqual(["Birinci", "İkinci"]);
    const turkce = model.examComparisons.find((row) => row.subjectName === "Türkçe");
    const matematik = model.examComparisons.find((row) => row.subjectName === "Matematik");
    const fen = model.examComparisons.find((row) => row.subjectName === "Fen Bilimleri");
    expect(turkce).toMatchObject({ latestNet: 12, previousNet: 10, delta: 2, assessment: "Arttı" });
    expect(matematik).toMatchObject({
      latestNet: 6,
      previousNet: 8,
      delta: -2,
      assessment: "Azaldı",
    });
    expect(fen).toMatchObject({
      latestNet: 15,
      previousNet: null,
      delta: null,
      assessment: "Karşılaştırma yapılamıyor",
    });
    expect(formatNetDelta(turkce?.delta ?? null)).toContain("+");
    expect(model.outcomeGaps[0]).toMatchObject({
      outcomeCode: "M.8.1.1",
      wrongCount: 2,
      blankCount: 0,
      totalGap: 2,
      priority: true,
    });
    expect(model.outcomeNetLinks.some((row) => row.subjectName === "Matematik")).toBe(true);
    expect(model.scoreTrend).toEqual([{ label: "19 Ekim 2026", value: 400 }]);
    expect(model.evaluation.join("\n")).toContain("Matematik");
  });

  it("does not invent trend language for a single exam", () => {
    const model = buildWeeklyReportModel({
      studentName: "Ayşe",
      generatedAt: new Date("2026-10-21T07:55:00.000Z"),
      period: "current",
      today,
      logs: [],
      goals: [],
      exams: [
        {
          title: "Tek",
          takenOn: "2026-10-20",
          examType: "lgs_full",
          totalNet: 20,
          score: null,
          ruleVersion: "lgs-v1",
          subjects: [{ subjectCode: "turkce", subjectName: "Türkçe", net: 10 }],
        },
      ],
      suggestion,
    });
    expect(model.canCompareExams).toBe(false);
    expect(model.examComparisons[0]?.assessment).toContain("Tek deneme");
    expect(model.evaluation.join("\n")).toMatch(/tek deneme/i);
    expect(model.evaluation.join("\n")).not.toContain("Net artışı görülen");
  });

  it("keeps empty study metrics as missing instead of fake zeros", () => {
    const model = buildWeeklyReportModel({
      studentName: "Ayşe",
      generatedAt: new Date("2026-10-21T07:55:00.000Z"),
      period: "current",
      today,
      logs: [],
      goals: [],
      exams: [],
      suggestion,
    });
    expect(model.hasStudyData).toBe(false);
    expect(model.summary.questionCount).toBeNull();
    expect(model.summary.examCount).toBe(0);
    expect(model.summary.lastExamTotalNet).toBeNull();
  });

  it("builds a monthly window without inventing monthly goals", () => {
    const model = buildWeeklyReportModel({
      studentName: "Ayşe",
      generatedAt: new Date("2026-10-21T07:55:00.000Z"),
      period: "current",
      scope: "month",
      today,
      logs: [log({ id: "a", studiedOn: "2026-10-05", questionCount: 3 })],
      goals: [
        {
          id: "week",
          period: "week",
          subjectId: null,
          subjectName: null,
          targetQuestions: 20,
        },
      ],
      exams: [],
      suggestion,
    });
    expect(model.scope).toBe("month");
    expect(model.title).toContain("Aylık");
    expect(model.goalRows).toEqual([]);
    expect(model.summary.questionCount).toBe(3);
  });

  it("keeps goal completion uncapped above 100 percent", () => {
    const goals: StudyGoalView[] = [
      {
        id: "week",
        period: "week",
        subjectId: null,
        subjectName: null,
        targetQuestions: 5,
      },
    ];
    const model = buildWeeklyReportModel({
      studentName: "Ayşe",
      generatedAt: new Date("2026-10-21T07:55:00.000Z"),
      period: "current",
      today,
      logs: [log({ id: "a", studiedOn: "2026-10-20", questionCount: 12 })],
      goals,
      exams: [],
      suggestion,
    });
    expect(model.goalRows).toEqual([
      {
        label: "Haftalık hedef: Tüm dersler",
        targetQuestions: 5,
        doneQuestions: 12,
        ratioLabel: "%240",
      },
    ]);
  });

  it("formats duration consistently", () => {
    expect(formatDurationMinutes(45)).toBe("45 dakika");
    expect(formatDurationMinutes(60)).toBe("1 saat");
    expect(formatDurationMinutes(75)).toBe("1 saat 15 dakika");
  });
});
