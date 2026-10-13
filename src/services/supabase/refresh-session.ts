import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS, withAuthCookieOptions } from "./cookie-options";
import { getSupabaseConfig } from "./config";

/**
 * Refreshes an expiring session before the request reaches Server Components (which cannot
 * write cookies). This is NOT an authorization check: pages and actions verify the user again
 * through the data access layer.
 */
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;

  const supabase = createServerClient(config.url, config.anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, withAuthCookieOptions(options));
        }
        for (const [key, value] of Object.entries(headers))
          response.headers.set(key, value);
      },
    },
  });

  // getUser (not getClaims) asks the auth server, so cookies of a session that was ended on
  // another device are cleared here, where cookies can be written. The result itself is
  // unused: pages and actions decide access through the data access layer.
  await supabase.auth.getUser();
  return response;
}
