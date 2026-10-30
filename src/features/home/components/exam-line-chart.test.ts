import { describe, expect, it } from "vitest";
import { pickValueLabelIndexes } from "./exam-line-chart";

describe("pickValueLabelIndexes", () => {
  it("labels a single point", () => {
    expect(pickValueLabelIndexes([100], [40])).toEqual([0]);
  });

  it("labels both ends of a two-point line", () => {
    expect(pickValueLabelIndexes([40, 220], [10, 20])).toEqual([0, 1]);
  });

  it("adds an interior peak when it stays far from both ends", () => {
    expect(pickValueLabelIndexes([40, 100, 160, 220], [10, 30, 18, 22])).toEqual([
      0, 1, 3,
    ]);
  });

  it("drops a crowded interior peak so labels do not collide", () => {
    expect(pickValueLabelIndexes([40, 70, 220], [10, 40, 20], 44)).toEqual([0, 2]);
  });
});
