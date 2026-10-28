import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

// Keep these pairs aligned with the text/background tokens in src/app/globals.css.
const PAIRS: { name: string; foreground: string; background: string; minimum: number }[] =
  [
    { name: "ink on canvas", foreground: "#0f1b2d", background: "#f3f7fc", minimum: 4.5 },
    {
      name: "ink on surface",
      foreground: "#0f1b2d",
      background: "#ffffff",
      minimum: 4.5,
    },
    {
      name: "ink on surface muted",
      foreground: "#0f1b2d",
      background: "#eef3f9",
      minimum: 4.5,
    },
    {
      name: "secondary text",
      foreground: "#2b3a52",
      background: "#ffffff",
      minimum: 4.5,
    },
    {
      name: "secondary text on surface muted",
      foreground: "#2b3a52",
      background: "#eef3f9",
      minimum: 4.5,
    },
    { name: "help text", foreground: "#4a5870", background: "#ffffff", minimum: 4.5 },
    {
      name: "muted help text on surface",
      foreground: "#64748b",
      background: "#ffffff",
      minimum: 4.5,
    },
    { name: "brand link", foreground: "#115e59", background: "#ffffff", minimum: 4.5 },
    {
      name: "primary button",
      foreground: "#ffffff",
      background: "#0f766e",
      minimum: 4.5,
    },
    { name: "error text", foreground: "#b91c1c", background: "#fef2f2", minimum: 4.5 },
    { name: "success text", foreground: "#166534", background: "#effbf3", minimum: 4.5 },
    {
      name: "ink on success wash",
      foreground: "#0f1b2d",
      background: "#effbf3",
      minimum: 4.5,
    },
    {
      name: "secondary text on success wash",
      foreground: "#2b3a52",
      background: "#effbf3",
      minimum: 4.5,
    },
    { name: "info text", foreground: "#1d4ed8", background: "#eff5ff", minimum: 4.5 },
    { name: "warning text", foreground: "#92400e", background: "#fff8eb", minimum: 4.5 },
    {
      name: "ink on soft canvas",
      foreground: "#0f1b2d",
      background: "#e7f3f0",
      minimum: 4.5,
    },
    {
      name: "secondary text on soft canvas",
      foreground: "#2b3a52",
      background: "#e7f3f0",
      minimum: 4.5,
    },
    {
      name: "ink on accent wash",
      foreground: "#0f1b2d",
      background: "#eff6ff",
      minimum: 4.5,
    },
    {
      name: "accent text on accent wash",
      foreground: "#1d4ed8",
      background: "#eff6ff",
      minimum: 4.5,
    },
    {
      name: "secondary text on accent wash",
      foreground: "#2b3a52",
      background: "#eff6ff",
      minimum: 4.5,
    },
    { name: "ink on tile 1", foreground: "#0f1b2d", background: "#e5f4f1", minimum: 4.5 },
    { name: "ink on tile 2", foreground: "#0f1b2d", background: "#fff3e0", minimum: 4.5 },
    { name: "ink on tile 3", foreground: "#0f1b2d", background: "#e7eefb", minimum: 4.5 },
    { name: "ink on tile 4", foreground: "#0f1b2d", background: "#f1f6e6", minimum: 4.5 },
    { name: "ink on tile 5", foreground: "#0f1b2d", background: "#f8efe6", minimum: 4.5 },
    { name: "ink on tile 6", foreground: "#0f1b2d", background: "#e5f4f8", minimum: 4.5 },
    {
      name: "ink on stage pill",
      foreground: "#0f1b2d",
      background: "#cdf5ef",
      minimum: 4.5,
    },
    {
      name: "ink on medal",
      foreground: "#0f1b2d",
      background: "#fff8eb",
      minimum: 4.5,
    },
    {
      name: "ink on brand wash",
      foreground: "#0f1b2d",
      background: "#effcfa",
      minimum: 4.5,
    },
    {
      name: "help text on brand wash",
      foreground: "#4a5870",
      background: "#effcfa",
      minimum: 4.5,
    },
    // Home character scene: text sits on the accent-100 → accent-50 → brand-100 wash.
    {
      name: "ink on scene sky",
      foreground: "#0f1b2d",
      background: "#dbeafe",
      minimum: 4.5,
    },
    {
      name: "secondary text on scene sky",
      foreground: "#2b3a52",
      background: "#dbeafe",
      minimum: 4.5,
    },
    {
      name: "secondary text on scene mint",
      foreground: "#2b3a52",
      background: "#cdf5ef",
      minimum: 4.5,
    },
    {
      name: "scene eyebrow on sky",
      foreground: "#134e4a",
      background: "#dbeafe",
      minimum: 4.5,
    },
    {
      name: "scene eyebrow on accent wash",
      foreground: "#134e4a",
      background: "#eff6ff",
      minimum: 4.5,
    },
    {
      name: "scene eyebrow on mint",
      foreground: "#134e4a",
      background: "#cdf5ef",
      minimum: 4.5,
    },
    {
      name: "icon chip on brand wash",
      foreground: "#134e4a",
      background: "#cdf5ef",
      minimum: 4.5,
    },
    {
      name: "icon chip on accent chip",
      foreground: "#1d4ed8",
      background: "#dbeafe",
      minimum: 4.5,
    },
    {
      name: "icon chip on warm chip",
      foreground: "#92400e",
      background: "#fff8eb",
      minimum: 4.5,
    },
    {
      name: "danger text on danger wash",
      foreground: "#b91c1c",
      background: "#fef2f2",
      minimum: 4.5,
    },
    {
      name: "ink on coach card wash",
      foreground: "#0f1b2d",
      background: "#effcfa",
      minimum: 4.5,
    },
  ];

describe("design token contrast", () => {
  it.each(PAIRS)(
    "$name meets WCAG AA for normal text",
    ({ foreground, background, minimum }) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
    },
  );
});
