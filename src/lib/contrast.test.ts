import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

// Keep these pairs aligned with the text/background tokens in src/app/globals.css.
const PAIRS: { name: string; foreground: string; background: string; minimum: number }[] =
  [
    { name: "ink on canvas", foreground: "#0f1b2d", background: "#f6f8fb", minimum: 4.5 },
    {
      name: "ink on surface",
      foreground: "#0f1b2d",
      background: "#ffffff",
      minimum: 4.5,
    },
    {
      name: "secondary text",
      foreground: "#2b3a52",
      background: "#ffffff",
      minimum: 4.5,
    },
    { name: "help text", foreground: "#4a5870", background: "#ffffff", minimum: 4.5 },
    { name: "brand link", foreground: "#115e59", background: "#ffffff", minimum: 4.5 },
    {
      name: "primary button",
      foreground: "#ffffff",
      background: "#0f766e",
      minimum: 4.5,
    },
    { name: "error text", foreground: "#b91c1c", background: "#fef2f2", minimum: 4.5 },
    { name: "success text", foreground: "#166534", background: "#effbf3", minimum: 4.5 },
    { name: "info text", foreground: "#1d4ed8", background: "#eff5ff", minimum: 4.5 },
    { name: "warning text", foreground: "#92400e", background: "#fff8eb", minimum: 4.5 },
  ];

describe("design token contrast", () => {
  it.each(PAIRS)(
    "$name meets WCAG AA for normal text",
    ({ foreground, background, minimum }) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
    },
  );
});
