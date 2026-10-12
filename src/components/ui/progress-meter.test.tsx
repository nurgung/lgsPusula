import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressMeter } from "./progress-meter";

describe("ProgressMeter", () => {
  it("exposes value and unit as text, not only as a bar", () => {
    render(<ProgressMeter label="Çözülen soru" value={6} max={10} unit="soru" />);
    const bar = screen.getByRole("progressbar", { name: "Çözülen soru" });
    expect(bar.getAttribute("aria-valuenow")).toBe("6");
    expect(bar.getAttribute("aria-valuetext")).toBe("6 / 10 soru");
    expect(screen.getByText("6 / 10 soru")).toBeDefined();
  });

  it("clamps the bar but keeps the real value in the text when over target", () => {
    render(<ProgressMeter label="Soru" value={14} max={10} unit="soru" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("10");
    expect(screen.getByText("14 / 10 soru")).toBeDefined();
  });

  it("handles a zero target without dividing by zero", () => {
    render(<ProgressMeter label="Soru" value={0} max={0} unit="soru" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });
});
