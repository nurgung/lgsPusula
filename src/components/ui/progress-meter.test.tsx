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

  it("keeps the real count beside a larger daily figure", () => {
    render(<ProgressMeter label="Tüm dersler" value={4} max={10} unit="soru" size="hero" />);
    const bar = screen.getByRole("progressbar", { name: "Tüm dersler" });
    expect(bar.getAttribute("aria-valuenow")).toBe("4");
    expect(bar.getAttribute("aria-valuetext")).toBe("4 / 10 soru");
    expect(bar.className).toContain("h-5");
    const figure = screen.getByText(
      (_content, node) => node?.textContent?.replace(/\s+/g, " ").trim() === "4 / 10 soru",
    );
    expect(figure.querySelector(".text-metric-lg")?.textContent).toBe("4");
    expect(figure.textContent).not.toContain("Hedefe ulaştın");
  });

  it("keeps an empty goal on a neutral track and the default track teal", () => {
    const { rerender } = render(
      <ProgressMeter label="Soru" value={0} max={10} unit="soru" track="quiet" />,
    );
    const quiet = screen.getByRole("progressbar", { name: "Soru" });
    expect(quiet.className).toContain("bg-border");
    expect(quiet.firstElementChild?.className).toContain("w-0");
    rerender(<ProgressMeter label="Soru" value={0} max={10} unit="soru" />);
    expect(screen.getByRole("progressbar", { name: "Soru" }).className).toContain("bg-brand-100");
  });
});
