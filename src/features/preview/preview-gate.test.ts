// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isUiPreviewEnabled } from "./preview-gate";

describe("isUiPreviewEnabled", () => {
  it("is disabled unless explicitly enabled", () => {
    expect(
      isUiPreviewEnabled({ UI_PREVIEW_ENABLED: false, APP_ENV: "development" }),
    ).toBe(false);
  });

  it("is enabled outside production when the flag is set", () => {
    expect(isUiPreviewEnabled({ UI_PREVIEW_ENABLED: true, APP_ENV: "development" })).toBe(
      true,
    );
    expect(isUiPreviewEnabled({ UI_PREVIEW_ENABLED: true, APP_ENV: "staging" })).toBe(
      true,
    );
  });

  it("is never enabled in production", () => {
    expect(isUiPreviewEnabled({ UI_PREVIEW_ENABLED: true, APP_ENV: "production" })).toBe(
      false,
    );
  });
});
