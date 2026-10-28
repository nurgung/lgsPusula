import "server-only";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import {
  AUTH_COOKIE_OPTIONS,
  parseCookieHeader,
  withAuthCookieOptions,
} from "./cookie-options";
import { requireSupabaseConfig } from "./config";

function applyCookieWrites(
  jar: { name: string; value: string }[],
  cookiesToSet: { name: string; value: string }[],
) {
  for (const { name, value } of cookiesToSet) {
    const index = jar.findIndex((row) => row.name === name);
    if (!value) {
      if (index >= 0) jar.splice(index, 1);
      continue;
    }
    if (index >= 0) jar[index] = { name, value };
    else jar.push({ name, value });
  }
}

/**
 * Client bound to the signed-in user's session cookies; queries run under RLS as that user.
 *
 * Reads use the request `Cookie` header via `headers()`, not `cookies()`. With
 * `cacheComponents`, awaiting `cookies()` during a Server Action re-render can throw
 * InvariantError in development (userspaceMutableCookies vs asyncApiPromises). Writes in
 * Server Actions / Route Handlers still go through `cookies().set`.
 *
 * Server Components use `{ writable: false }` and rely on `src/proxy.ts` having refreshed
 * the session earlier in the same request. Server Actions and Route Handlers use
 * `{ writable: true }`. Create a new client per request.
 */
export async function createSessionClient({
  writable,
}: {
  writable: boolean;
}): Promise<SupabaseClient> {
  const config = requireSupabaseConfig();
  const requestCookies = parseCookieHeader((await headers()).get("cookie"));
  const cookieMethods: CookieMethodsServer = {
    getAll: () => requestCookies,
  };
  if (writable) {
    cookieMethods.setAll = async (cookiesToSet) => {
      const store = await cookies();
      for (const { name, value, options } of cookiesToSet) {
        store.set(name, value, withAuthCookieOptions(options));
      }
      applyCookieWrites(requestCookies, cookiesToSet);
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
