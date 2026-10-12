// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { serverEnvSchema } from "@/lib/env/server";

const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|API_KEY|_KEY$)/;
const NON_SECRET_DEFAULTS = new Set([
  "NEXT_PUBLIC_APP_URL",
  "APP_ENV",
  "UI_PREVIEW_ENABLED",
  "REPORT_TEMP_TTL_MINUTES",
]);

function readEnvExample(): Map<string, string> {
  const text = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  const entries = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    entries.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }
  return entries;
}

describe(".env.example", () => {
  const entries = readEnvExample();

  it("never exposes secret-looking variables to the browser", () => {
    const leaked = [...entries.keys()].filter(
      (key) => key.startsWith("NEXT_PUBLIC_") && SECRET_NAME.test(key),
    );
    expect(leaked).toEqual([]);
  });

  it("contains no values except documented non-secret defaults", () => {
    const filled = [...entries].filter(
      ([key, value]) => value !== "" && !NON_SECRET_DEFAULTS.has(key),
    );
    expect(filled).toEqual([]);
  });

  it("documents every server variable the app validates", () => {
    const schemaKeys = Object.keys(serverEnvSchema.shape);
    const missing = schemaKeys.filter((key) => !entries.has(key));
    expect(missing).toEqual([]);
  });
});
