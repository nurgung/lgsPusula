// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseServerEnv, ServerEnvError } from "./server";

describe("parseServerEnv", () => {
  it("applies safe defaults when nothing is configured", () => {
    const env = parseServerEnv({});
    expect(env.APP_ENV).toBe("development");
    expect(env.UI_PREVIEW_ENABLED).toBe(false);
    expect(env.REPORT_TEMP_TTL_MINUTES).toBe(30);
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("treats empty strings from .env files as unset", () => {
    const env = parseServerEnv({ DATABASE_URL: "", AI_API_KEY: "  ", APP_ENV: "" });
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.AI_API_KEY).toBeUndefined();
    expect(env.APP_ENV).toBe("development");
  });

  it("enables previews only with the explicit string 'true'", () => {
    expect(parseServerEnv({ UI_PREVIEW_ENABLED: "true" }).UI_PREVIEW_ENABLED).toBe(true);
    expect(() => parseServerEnv({ UI_PREVIEW_ENABLED: "yes" })).toThrow(ServerEnvError);
  });

  it("rejects UI previews in production", () => {
    expect(() =>
      parseServerEnv({ APP_ENV: "production", UI_PREVIEW_ENABLED: "true" }),
    ).toThrow(/UI_PREVIEW_ENABLED/);
  });

  it("rejects a too-short AUTH_SECRET", () => {
    expect(() => parseServerEnv({ AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("rejects out-of-range report TTL values", () => {
    expect(() => parseServerEnv({ REPORT_TEMP_TTL_MINUTES: "0" })).toThrow(
      ServerEnvError,
    );
    expect(() => parseServerEnv({ REPORT_TEMP_TTL_MINUTES: "-5" })).toThrow(
      ServerEnvError,
    );
    expect(() => parseServerEnv({ REPORT_TEMP_TTL_MINUTES: "99999" })).toThrow(
      ServerEnvError,
    );
  });

  it("reports variable names but never secret values", () => {
    const secret = "not-a-url-super-secret-value";
    try {
      parseServerEnv({ DATABASE_URL: secret });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ServerEnvError);
      expect((error as ServerEnvError).invalidKeys).toEqual(["DATABASE_URL"]);
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
