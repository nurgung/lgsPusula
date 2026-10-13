import type { CookieOptions } from "@supabase/ssr";

/**
 * Session cookies are only ever read on the server (there is no browser Supabase client), so
 * they are always HttpOnly. `secure` stays on in development too: browsers accept Secure
 * cookies on http://localhost, but not on a LAN IP — use HTTPS when testing from a phone.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
} as const satisfies CookieOptions;

/** Keeps lifetime fields from the library (maxAge/expires) but forces our security flags. */
export function withAuthCookieOptions(options: CookieOptions | undefined): CookieOptions {
  return { ...options, ...AUTH_COOKIE_OPTIONS };
}
