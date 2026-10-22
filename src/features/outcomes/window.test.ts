import { describe, expect, it } from "vitest";
import { STUDY_DATE_MIN } from "@/features/study/calendar";
import { examChartWindow, outcomeAnalysisWindow } from "./window";

describe("exam windows", () => {
  it("keeps outcome analysis at 90 days including today", () => {
    expect(outcomeAnalysisWindow("2026-10-22")).toEqual({
      from: "2026-07-25",
      to: "2026-10-22",
    });
  });

  it("includes every enterable exam date on the net chart", () => {
    const window = examChartWindow("2026-10-22");
    expect(window).toEqual({ from: STUDY_DATE_MIN, to: "2026-10-22" });
    expect("2026-04-10" >= window.from && "2026-04-10" <= window.to).toBe(true);
    expect("2026-10-18" >= window.from && "2026-10-18" <= window.to).toBe(true);
  });
});
