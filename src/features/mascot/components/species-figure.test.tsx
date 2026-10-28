import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SPECIES } from "../species";
import { SpeciesFigure } from "./species-figure";

describe("SpeciesFigure", () => {
  it("draws every species as a hidden vector with an outline and a face", () => {
    for (const species of SPECIES) {
      const { container, unmount } = render(<SpeciesFigure code={species.code} />);
      const stage = container.querySelector(`[data-species-figure="${species.code}"]`);
      expect(stage?.getAttribute("aria-hidden")).toBe("true");
      expect(stage?.querySelector("svg")).toBeTruthy();
      expect(stage?.querySelector("canvas")).toBeNull();
      expect(stage?.querySelector("img")).toBeNull();
      expect(stage?.querySelectorAll(".species-line").length).toBeGreaterThan(2);
      expect(stage?.querySelector(".species-eyes")).toBeTruthy();
      unmount();
    }
  });

  it("keeps the size, health and stage markers the layout and tests read", () => {
    const { container } = render(
      <SpeciesFigure code="cat" size="hero" health="tired" stage="growing" />,
    );
    const stage = container.querySelector("[data-species-figure]");
    expect(stage?.getAttribute("data-figure-size")).toBe("hero");
    expect(stage?.getAttribute("data-health")).toBe("tired");
    expect(stage?.getAttribute("data-growth-stage")).toBe("growing");
  });

  it("adds a resting blanket to sick animals but not to plants", () => {
    const cat = render(<SpeciesFigure code="cat" health="sick" />);
    expect(cat.container.querySelector(".species-blanket")).toBeTruthy();
    cat.unmount();
    const daisy = render(<SpeciesFigure code="daisy" health="sick" />);
    expect(daisy.container.querySelector(".species-blanket")).toBeNull();
  });

  it("marks later stages with a small shape and leaves the first stage plain", () => {
    const first = render(<SpeciesFigure code="turtle" stage="new" />);
    expect(first.container.querySelector(".species-mark")).toBeNull();
    first.unmount();
    for (const stage of ["settling", "growing", "companion"] as const) {
      const view = render(<SpeciesFigure code="turtle" stage={stage} />);
      expect(view.container.querySelector(".species-mark")).toBeTruthy();
      view.unmount();
    }
  });
});
