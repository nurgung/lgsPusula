import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { addCalendarDays } from "@/features/study/calendar";
import { MASCOT_MESSAGES, supportiveCopyIssues } from "./messages";
import { SPECIES } from "./species";
import {
  brokenStreakDate,
  evaluateGrowth,
  growthNoticeKey,
  mergeGrowthNotices,
  type DatedPoints,
  type GrowthFacts,
  type StudyContribution,
} from "./growth";

const TODAY = "2026-10-24";

function span(end: string, count: number, questions = 1): StudyContribution[] {
  return Array.from({ length: count }, (_, index) => ({
    studiedOn: addCalendarDays(end, index - (count - 1)),
    questionCount: questions,
  }));
}

function pointsFor(logs: readonly StudyContribution[], each = 5): DatedPoints[] {
  const days = [...new Set(logs.map((log) => log.studiedOn))];
  return days.map((sourceDate) => ({ points: each, sourceDate }));
}

function facts(
  logs: readonly StudyContribution[],
  today = TODAY,
  rewards: readonly DatedPoints[] = pointsFor(logs),
): GrowthFacts {
  return { today, logs, rewards };
}

describe("growth stage", () => {
  it("does not skip two stages when one record finishes the higher counts", () => {
    const yesterday = addCalendarDays(TODAY, -1);
    const beforeLogs = span(yesterday, 29, 1);
    const before = evaluateGrowth(facts(beforeLogs, yesterday));
    const after = evaluateGrowth(
      facts([...beforeLogs, { studiedOn: TODAY, questionCount: 800 }], TODAY),
    );

    expect(before.stageId).toBe("settling");
    expect(after.questions).toBe(829);
    expect(after.currentStreak).toBe(30);
    expect(after.points).toBeGreaterThanOrEqual(60);
    expect(after.stageId).toBe("growing");
    expect(after.stageEarnedOn).toBe(TODAY);
  });

  it("stays at the first stage until the seven-day streak exists", () => {
    const view = evaluateGrowth(facts(span(TODAY, 6, 100)));
    expect(view.stageId).toBe("new");
    expect(view.currentStreak).toBe(6);
    expect(view.requirements.find((item) => item.id === "streak")?.gap).toBe(
      "7 günlük seriyi tamamlaman gerekiyor",
    );
  });

  it("opens the second stage only when streak, days, and points are all met", () => {
    const ready = evaluateGrowth(facts(span(TODAY, 7, 1)));
    expect(ready.stageId).toBe("settling");
    expect(ready.studyDays).toBe(7);

    const lowPoints = evaluateGrowth(
      facts(span(TODAY, 7, 1), TODAY, [{ points: 5, sourceDate: TODAY }]),
    );
    expect(lowPoints.stageId).toBe("new");
    expect(lowPoints.requirements.find((item) => item.id === "points")?.gap).toContain(
      "10 karakter puanından 5 tanesine ulaştın",
    );
  });

  it("keeps a higher stage closed while questions or points are short", () => {
    const shortQuestions = evaluateGrowth(facts(span(TODAY, 14, 10)));
    expect(shortQuestions.stageId).toBe("settling");
    expect(shortQuestions.questions).toBe(140);
    expect(shortQuestions.requirements.find((item) => item.id === "questions")?.gap).toBe(
      "300 sorudan 140 tanesini tamamladın",
    );

    const twoHundredFortyFive = span(TODAY, 14, 1);
    twoHundredFortyFive[0] = {
      studiedOn: twoHundredFortyFive[0]?.studiedOn ?? TODAY,
      questionCount: 232,
    };
    const partial = evaluateGrowth(facts(twoHundredFortyFive));
    expect(partial.questions).toBe(245);
    expect(partial.requirements.find((item) => item.id === "questions")?.gap).toBe(
      "300 sorudan 245 tanesini tamamladın",
    );
  });

  it("keeps an earned stage when the streak later breaks", () => {
    const earnedOn = "2026-10-17";
    const logs = span(earnedOn, 7, 1);
    const view = evaluateGrowth(facts(logs, "2026-10-21"));
    expect(view.stageId).toBe("settling");
    expect(view.stageEarnedOn).toBe(earnedOn);
    expect(view.currentStreak).toBe(0);
    expect(view.longestStreak).toBe(7);
    expect(view.points).toBe(35);
  });
});

describe("growth streak", () => {
  it("counts a calendar day once and ignores a second log that day", () => {
    const view = evaluateGrowth(
      facts([
        { studiedOn: TODAY, questionCount: 4 },
        { studiedOn: TODAY, questionCount: 9 },
      ]),
    );
    expect(view.currentStreak).toBe(1);
    expect(view.studyDays).toBe(1);
    expect(view.longestStreak).toBe(1);
    expect(view.questions).toBe(13);
  });

  it("resets the current streak on a missed day and keeps the longest run", () => {
    const logs = span("2026-10-20", 4, 1);
    const view = evaluateGrowth(facts(logs, "2026-10-22"));
    expect(view.currentStreak).toBe(0);
    expect(view.longestStreak).toBe(4);
    expect(view.studyDays).toBe(4);
    expect(brokenStreakDate(logs.map((log) => log.studiedOn).sort(), "2026-10-22")).toBe(
      "2026-10-21",
    );
  });

  it("does not treat the unfinished day as a miss", () => {
    const logs = span("2026-10-23", 3, 1);
    const view = evaluateGrowth(facts(logs, TODAY));
    expect(view.studiedToday).toBe(false);
    expect(view.currentStreak).toBe(3);
    expect(view.notices.some((notice) => notice.kind === "streak_broken")).toBe(false);
  });

  it("ignores a future log", () => {
    const view = evaluateGrowth(
      facts([...span(TODAY, 2, 3), { studiedOn: "2026-10-25", questionCount: 40 }]),
    );
    expect(view.studyDays).toBe(2);
    expect(view.questions).toBe(6);
    expect(view.currentStreak).toBe(2);
  });

  it("recomputes when a past day is removed, edited, or restored", () => {
    const logs = span(TODAY, 7, 1);
    const earned = evaluateGrowth(facts(logs));
    expect(earned.stageId).toBe("settling");

    const middle = logs[3]?.studiedOn;
    const removed = evaluateGrowth(facts(logs.filter((log) => log.studiedOn !== middle)));
    expect(removed.longestStreak).toBeLessThan(7);
    expect(removed.stageId).toBe("new");

    const edited = logs.map((log, index) =>
      index === 6 ? { ...log, questionCount: 20 } : log,
    );
    expect(evaluateGrowth(facts(edited)).questions).toBe(26);
    expect(evaluateGrowth(facts(logs)).stageId).toBe("settling");
  });
});

describe("growth health", () => {
  const earned = span("2026-10-17", 1, 2);

  it("does not become sick only because today is still open", () => {
    const view = evaluateGrowth(facts(earned, "2026-10-20"));
    expect(view.health).toBe("tired");
    expect(view.stageId).toBe("new");
    expect(view.points).toBe(5);
  });

  it("becomes sick after three completed days without a log", () => {
    const view = evaluateGrowth(facts(earned, "2026-10-21"));
    expect(view.health).toBe("sick");
    expect(view.notices).toEqual(
      expect.arrayContaining([
        { kind: "streak_broken", noticeDate: "2026-10-18" },
        { kind: "mascot_sick", noticeDate: "2026-10-20" },
      ]),
    );
    expect(view.points).toBe(5);
    expect(view.stageId).toBe("new");
  });

  it("starts recovery on the first valid log and returns to healthy after two study days", () => {
    const first = evaluateGrowth(
      facts([...earned, { studiedOn: "2026-10-21", questionCount: 2 }], "2026-10-21"),
    );
    expect(first.health).toBe("recovering");
    expect(first.notices).toContainEqual({
      kind: "mascot_recovering",
      noticeDate: "2026-10-21",
    });

    const second = evaluateGrowth(
      facts(
        [
          ...earned,
          { studiedOn: "2026-10-21", questionCount: 2 },
          { studiedOn: "2026-10-22", questionCount: 2 },
        ],
        "2026-10-22",
      ),
    );
    expect(second.health).toBe("healthy");
  });

  it("restarts the recovery run when a study day is skipped", () => {
    const view = evaluateGrowth(
      facts(
        [
          ...earned,
          { studiedOn: "2026-10-21", questionCount: 2 },
          { studiedOn: "2026-10-23", questionCount: 2 },
        ],
        "2026-10-23",
      ),
    );
    expect(view.health).toBe("recovering");
    expect(view.notices).toContainEqual({
      kind: "mascot_recovering",
      noticeDate: "2026-10-23",
    });
  });
});

describe("growth notices and isolation", () => {
  it("does not create a second notice for the same state", () => {
    const view = evaluateGrowth(facts(span("2026-10-17", 1, 2), "2026-10-21"));
    expect(view.notices).toEqual(
      evaluateGrowth(facts(span("2026-10-17", 1, 2), "2026-10-21")).notices,
    );
    const keys = view.notices.map(growthNoticeKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(mergeGrowthNotices(view.notices, view.notices)).toEqual(view.notices);
    expect(mergeGrowthNotices(view.notices, view.notices)).toHaveLength(
      view.notices.length,
    );
  });

  it("does not mix one student's logs into another student's stage", () => {
    const studentA = evaluateGrowth(facts(span(TODAY, 7, 40)));
    const studentB = evaluateGrowth({ today: TODAY, logs: [], rewards: [] });
    expect(studentA.stageId).toBe("settling");
    expect(studentA.questions).toBe(280);
    expect(studentB.stageId).toBe("new");
    expect(studentB.questions).toBe(0);
    expect(studentB.health).toBe("healthy");
    expect(studentB.notices).toEqual([]);
  });

  it("keeps the notice sentences supportive and in-app", () => {
    const texts = [
      MASCOT_MESSAGES.noticeStreakTitle,
      MASCOT_MESSAGES.noticeStreakBody,
      MASCOT_MESSAGES.noticeSickTitle,
      MASCOT_MESSAGES.noticeSickBody,
      MASCOT_MESSAGES.noticeRecoveringTitle,
      MASCOT_MESSAGES.noticeRecoveringBody,
      MASCOT_MESSAGES.noticeStageTitle,
      MASCOT_MESSAGES.noticeInApp,
      MASCOT_MESSAGES.streakNote,
      MASCOT_MESSAGES.healthSickDetail,
    ];
    for (const text of texts) expect(supportiveCopyIssues(text)).toEqual([]);
    expect(MASCOT_MESSAGES.noticeInApp).toContain("Telefon bildirimi gönderilmez");
  });

  it("keeps row access on the existing notice table", () => {
    const sql = readFileSync(
      "supabase/migrations/20261024190000_mascot_growth_notices.sql",
      "utf8",
    );
    expect(sql).toContain("open_growth_notice");
    expect(sql).not.toMatch(/create table/i);
    expect(sql).not.toMatch(/drop policy/i);
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("not a student");
    expect(sql).toContain(
      "on conflict (student_id, kind, notice_date, sequence) do nothing",
    );
    expect(sql).toContain("streak_broken");
    expect(sql).toContain("mascot_sick");
    expect(sql).toContain("mascot_recovering");
    expect(sql).toContain("stage_earned");
    expect(sql).not.toContain("grant insert on table public.in_app_notices");
    expect(sql).toContain(
      "grant execute on function public.open_growth_notice(text, date) to authenticated",
    );
    expect(sql).toContain(
      "revoke all on function public.open_growth_notice(text, date) from public, anon",
    );
  });
});

describe("growth copy stays off the species list", () => {
  it("does not rename a species", () => {
    expect(SPECIES.map((species) => species.code)).toEqual([
      "cat",
      "turtle",
      "sparrow",
      "platypus",
      "capybara",
      "daisy",
      "sapling",
    ]);
  });
});
