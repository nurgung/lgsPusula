import { describe, expect, it } from "vitest";
import {
  monthWindows,
  parentOverviewWindow,
  weekWindows,
  weeklyReportWindow,
} from "./periods";

describe("parent report periods", () => {
  it("stops the current week and month at today and keeps the previous ranges whole", () => {
    expect(weekWindows("2026-10-21")).toEqual({
      current: { from: "2026-10-19", to: "2026-10-21" },
      previous: { from: "2026-10-12", to: "2026-10-18" },
      unfinished: true,
    });
    expect(monthWindows("2026-10-21")).toEqual({
      current: { from: "2026-10-01", to: "2026-10-21" },
      previous: { from: "2026-09-01", to: "2026-09-30" },
      unfinished: true,
    });
    expect(weeklyReportWindow("2026-10-21", "current")).toEqual({
      from: "2026-10-19",
      to: "2026-10-21",
    });
    expect(weeklyReportWindow("2026-10-21", "previous")).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
  });

  it("includes the previous month when today is the first of a month", () => {
    expect(weekWindows("2026-03-01").current).toEqual({
      from: "2026-02-23",
      to: "2026-03-01",
    });
    expect(weekWindows("2026-03-01").unfinished).toBe(false);
    expect(monthWindows("2026-03-01").previous).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(parentOverviewWindow("2026-03-01")).toEqual({
      from: "2026-02-01",
      to: "2026-03-01",
    });
    expect(parentOverviewWindow("2026-10-21").from).toBe("2026-09-01");
  });
});
