import { describe, expect, it } from "vitest";
import { canShowReminder, isQuietTime } from "./notices";

const base = {
  enabled: true,
  now: "13:00:00",
  quietStart: "21:00",
  quietEnd: "08:00",
  hasStudyLogToday: false,
  shownToday: 0,
  undismissed: false,
  maxPerDay: 1,
};

describe("quiet hours", () => {
  it("treats equal clocks as no quiet hours and wraps past midnight", () => {
    expect(isQuietTime("13:00", "13:00", "13:00")).toBe(false);
    expect(isQuietTime("22:30", "21:00", "08:00")).toBe(true);
    expect(isQuietTime("07:59", "21:00", "08:00")).toBe(true);
    expect(isQuietTime("08:00", "21:00", "08:00")).toBe(false);
    expect(isQuietTime("13:00", "21:00", "08:00")).toBe(false);
    expect(isQuietTime("10:00", "08:00", "21:00")).toBe(true);
  });
});

describe("reminder decision", () => {
  it("hides the reminder when it is off, quiet, already logged, or at the daily cap", () => {
    expect(canShowReminder(base)).toBe(true);
    expect(canShowReminder({ ...base, enabled: false })).toBe(false);
    expect(canShowReminder({ ...base, now: "22:00" })).toBe(false);
    expect(canShowReminder({ ...base, hasStudyLogToday: true })).toBe(false);
    expect(canShowReminder({ ...base, shownToday: 1 })).toBe(false);
    expect(canShowReminder({ ...base, shownToday: 1, undismissed: true })).toBe(true);
    expect(canShowReminder({ ...base, shownToday: 1, undismissed: true, enabled: false })).toBe(
      false,
    );
  });
});
