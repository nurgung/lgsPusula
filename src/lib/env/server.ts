import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());

export const APP_ENVS = ["development", "test", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export const serverEnvSchema = z
  .object({
    APP_ENV: z.preprocess(emptyToUndefined, z.enum(APP_ENVS).default("development")),
    UI_PREVIEW_ENABLED: z
      .preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false"))
      .transform((value) => value === "true"),

    DATABASE_URL: optionalUrl,
    // HMAC key for rate-limit bucket keys, so usernames/IPs are never stored in plain text.
    AUTH_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
    /**
     * HMAC key for family invite code hashes stored in the shared database.
     * Must be identical on every environment that writes to the same Supabase project
     * (production, preview, and local-against-prod). Falls back to AUTH_SECRET when unset.
     */
    FAMILY_INVITE_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
    SUPABASE_URL: optionalUrl,
    SUPABASE_ANON_KEY: optionalText,
    SUPABASE_SERVICE_ROLE_KEY: optionalText,

    AI_PROVIDER: optionalText,
    AI_API_KEY: optionalText,
    AI_MODEL: optionalText,
    AI_ENABLED: z
      .preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false"))
      .transform((value) => value === "true"),
    AI_ZDR_CONFIRMED: z
      .preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false"))
      .transform((value) => value === "true"),
    AI_DAILY_REQUEST_LIMIT: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(100).default(20),
    ),

    STORAGE_BUCKET: optionalText,
    // Optional. Empty disables error reporting. Only an EU ingest DSN is accepted.
    SENTRY_DSN: optionalText,
    REPORT_TEMP_TTL_MINUTES: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(1440).default(30),
    ),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "production" && env.UI_PREVIEW_ENABLED) {
      ctx.addIssue({
        code: "custom",
        path: ["UI_PREVIEW_ENABLED"],
        message: "UI previews cannot be enabled when APP_ENV=production.",
      });
    }
    // Auth needs all three values together; a half-configured provider must fail loudly.
    const supabaseKeys = [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "AUTH_SECRET",
    ] as const;
    const configured = supabaseKeys.filter((key) => env[key] !== undefined);
    if (configured.length > 0 && configured.length < supabaseKeys.length) {
      for (const key of supabaseKeys) {
        if (env[key] === undefined) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Auth configuration is incomplete.",
          });
        }
      }
    }
    if (env.AI_PROVIDER !== undefined && env.AI_PROVIDER !== "groq") {
      ctx.addIssue({
        code: "custom",
        path: ["AI_PROVIDER"],
        message: "AI_PROVIDER must be groq.",
      });
    }
    if (
      env.SENTRY_DSN &&
      !/^https:\/\/[A-Za-z0-9]+@o[0-9]+\.ingest\.de\.sentry\.io\/[0-9]+$/.test(
        env.SENTRY_DSN,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["SENTRY_DSN"],
        message: "SENTRY_DSN must be an EU ingest DSN.",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class ServerEnvError extends Error {
  constructor(readonly invalidKeys: string[]) {
    // Only variable names are reported; values may be secrets.
    super(`Invalid server environment variables: ${invalidKeys.join(", ")}`);
    this.name = "ServerEnvError";
  }
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new ServerEnvError(keys);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
