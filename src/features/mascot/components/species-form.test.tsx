import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SPECIES } from "../species";
import { SpeciesForm } from "./species-form";

describe("SpeciesForm", () => {
  it("shows every character with its name beside the figure", () => {
    render(<SpeciesForm current="turtle" />);
    for (const species of SPECIES) {
      expect(screen.getByRole("radio", { name: new RegExp(species.name) })).toBeTruthy();
      expect(
        document.querySelector(`[data-species-figure="${species.code}"]`),
      ).toBeTruthy();
    }
    expect(document.querySelector("canvas")).toBeNull();
    expect(document.querySelector(".species-cat-head")).toBeTruthy();
    expect(document.querySelector(".species-turtle-shell")).toBeTruthy();
    expect(document.querySelectorAll(".species-petal")).toHaveLength(8);
    const turtle = screen.getByRole("radio", { name: /Kaplumbağa/ });
    expect(turtle).toBeInstanceOf(HTMLInputElement);
    expect((turtle as HTMLInputElement).checked).toBe(true);
  });
});
