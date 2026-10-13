import "server-only";
import { getServerEnv, type ServerEnv } from "@/lib/env/server";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  authSecret: string;
};

/** Returns null when auth is not configured (e.g. a fresh checkout without `.env.local`). */
export function getSupabaseConfig(
  env: ServerEnv = getServerEnv(),
): SupabaseConfig | null {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, AUTH_SECRET } = env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !AUTH_SECRET) {
    return null;
  }
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    authSecret: AUTH_SECRET,
  };
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Auth provider is not configured.");
    this.name = "AuthNotConfiguredError";
  }
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();
  if (!config) throw new AuthNotConfiguredError();
  return config;
}
