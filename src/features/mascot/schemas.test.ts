import { describe, expect, it } from "vitest";
import { notificationPreferencesSchema, speciesSchema } from "./schemas";

describe("mascot schemas", () => {
  it("accepts a known species and rejects an empty choice", () => {
    expect(speciesSchema.safeParse({ species: "daisy" }).success).toBe(true);
    expect(speciesSchema.safeParse({ species: "platypus" }).success).toBe(true);
    expect(speciesSchema.safeParse({ species: "capybara" }).success).toBe(true);
    expect(speciesSchema.safeParse({ species: "dragon" }).success).toBe(false);
  });

  it("accepts quiet hours, including equal clocks, and rejects a fourth reminder", () => {
    expect(
      notificationPreferencesSchema.safeParse({
        enabled: "kapali",
        quietStart: "21:00",
        quietEnd: "08:00",
        maxPerDay: "1",
      }).success,
    ).toBe(true);
    expect(
      notificationPreferencesSchema.safeParse({
        enabled: "acik",
        quietStart: "12:00",
        quietEnd: "12:00",
        maxPerDay: "2",
      }).success,
    ).toBe(true);
    expect(
      notificationPreferencesSchema.safeParse({
        enabled: "acik",
        quietStart: "25:00",
        quietEnd: "08:00",
        maxPerDay: "1",
      }).success,
    ).toBe(false);
    expect(
      notificationPreferencesSchema.safeParse({
        enabled: "acik",
        quietStart: "21:00",
        quietEnd: "08:00",
        maxPerDay: "4",
      }).success,
    ).toBe(false);
  });
});
