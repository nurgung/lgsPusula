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
    expect(env.AI_ENABLED).toBe(false);
    expect(env.AI_ZDR_CONFIRMED).toBe(false);
    expect(env.AI_DAILY_REQUEST_LIMIT).toBe(20);
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

  it("rejects a half-configured auth provider and names every missing variable", () => {
    try {
      parseServerEnv({ SUPABASE_URL: "http://127.0.0.1:54321" });
      expect.unreachable();
    } catch (error) {
      expect((error as ServerEnvError).invalidKeys).toEqual([
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "AUTH_SECRET",
      ]);
    }
  });

  it("accepts a complete auth configuration", () => {
    const env = parseServerEnv({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      AUTH_SECRET: "x".repeat(32),
    });
    expect(env.SUPABASE_URL).toBe("http://127.0.0.1:54321");
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

  it("rejects a Sentry DSN that is not the EU ingest host and does not echo it", () => {
    const dsn = "https://publickey@evil.example/123";
    try {
      parseServerEnv({ SENTRY_DSN: dsn });
      expect.unreachable();
    } catch (error) {
      expect((error as ServerEnvError).invalidKeys).toEqual(["SENTRY_DSN"]);
      expect((error as Error).message).not.toContain("evil.example");
    }
  });

  it("accepts an EU Sentry DSN and treats an empty one as off", () => {
    expect(parseServerEnv({ SENTRY_DSN: "" }).SENTRY_DSN).toBeUndefined();
    expect(
      parseServerEnv({ SENTRY_DSN: "https://abc123key@o99.ingest.de.sentry.io/456" })
        .SENTRY_DSN,
    ).toContain("ingest.de.sentry.io");
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

  it("accepts only the groq provider name", () => {
    expect(parseServerEnv({ AI_PROVIDER: "groq" }).AI_PROVIDER).toBe("groq");
    expect(() => parseServerEnv({ AI_PROVIDER: "other" })).toThrow(/AI_PROVIDER/);
  });
});
