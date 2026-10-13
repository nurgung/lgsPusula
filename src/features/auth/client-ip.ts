/**
 * Client IP for rate limiting only. Vercel overwrites `x-real-ip` / `x-forwarded-for` with the
 * real client address. Elsewhere (local dev) these headers can be spoofed, which only weakens
 * the per-IP limit; the per-username limit still applies.
 */
export function getClientIp(headers: Pick<Headers, "get">): string {
  const realIp = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = realIp || forwarded;
  return ip ? ip.slice(0, 64) : "unknown";
}
