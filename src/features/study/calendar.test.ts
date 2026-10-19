import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calendarDateInTimeZone,
  defaultComparisonWindows,
  endOfWeek,
  formatTurkishDate,
  goalWindow,
  inclusiveDayCount,
  startOfWeek,
  weekdayIndexMonday,
} from "./calendar";

describe("Europe/Istanbul day boundary", () => {
  it("keeps 20:59 UTC on the same Istanbul day and rolls at 21:00 UTC", () => {
    expect(calendarDateInTimeZone(new Date("2026-10-19T20:59:59.000Z"))).toBe(
      "2026-10-19",
    );
    expect(calendarDateInTimeZone(new Date("2026-10-19T21:00:00.000Z"))).toBe(
      "2026-10-20",
    );
  });

  it("treats Monday as the start of the week, including a month boundary", () => {
    expect(weekdayIndexMonday("2026-10-19")).toBe(0);
    expect(startOfWeek("2026-10-19")).toBe("2026-10-19");
    expect(endOfWeek("2026-10-19")).toBe("2026-10-25");
    // 1 March 2026 is a Sunday, so its week began on 23 February.
    expect(weekdayIndexMonday("2026-03-01")).toBe(6);
    expect(startOfWeek("2026-03-01")).toBe("2026-02-23");
    expect(endOfWeek("2026-03-01")).toBe("2026-03-01");
  });

  it("adds civil days without shifting across a time zone", () => {
    expect(addCalendarDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("builds a weekly goal window and a comparison that stops at today", () => {
    expect(goalWindow("day", "2026-10-21")).toEqual({
      from: "2026-10-21",
      to: "2026-10-21",
    });
    expect(goalWindow("week", "2026-10-21")).toEqual({
      from: "2026-10-19",
      to: "2026-10-25",
    });
    expect(defaultComparisonWindows("2026-10-21")).toEqual({
      current: { from: "2026-10-19", to: "2026-10-21" },
      previous: { from: "2026-10-12", to: "2026-10-18" },
    });
    expect(inclusiveDayCount("2026-10-12", "2026-10-18")).toBe(7);
  });

  it("formats a date in Turkish without moving it to the previous day", () => {
    expect(formatTurkishDate("2026-10-19")).toBe("19 Ekim 2026");
  });
});
