import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AUTH_COOKIE_OPTIONS, withAuthCookieOptions } from "./cookie-options";
import { requireSupabaseConfig } from "./config";

/**
 * Client bound to the signed-in user's session cookies; queries run under RLS as that user.
 *
 * Server Components cannot write cookies, so they use `{ writable: false }` and rely on
 * `src/proxy.ts` having refreshed the session earlier in the same request. Server Actions and
 * Route Handlers use `{ writable: true }`. Create a new client per request.
 */
export async function createSessionClient({
  writable,
}: {
  writable: boolean;
}): Promise<SupabaseClient> {
  const config = requireSupabaseConfig();
  const cookieStore = await cookies();
  const cookieMethods: CookieMethodsServer = { getAll: () => cookieStore.getAll() };
  if (writable) {
    cookieMethods.setAll = (cookiesToSet) => {
      for (const { name, value, options } of cookiesToSet) {
        cookieStore.set(name, value, withAuthCookieOptions(options));
      }
    };
  }
  return createServerClient(config.url, config.anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: cookieMethods,
  });
}

/**
 * Bypasses RLS. Only for server-side work the user may not do directly (audit log, rate
 * limits, clearing `must_change_password`). Never pass its results to the client unfiltered.
 */
export function createServiceClient(): SupabaseClient {
  const config = requireSupabaseConfig();
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Stateless anon client with no cookie storage. Used to verify a password without touching the
 * caller's session.
 */
export function createEphemeralAuthClient(): SupabaseClient {
  const config = requireSupabaseConfig();
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
