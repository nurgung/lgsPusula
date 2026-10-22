const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const QUERY = /\?[^ \n#]+/g;
const SECRET_ASSIGN =
  /\b(password|passwd|token|secret|authorization|cookie|apikey|api_key|service_role)\b\s*[:=]\s*\S+/gi;

/** Removes identifiers and secrets from a string before it can leave the server. */
export function scrubText(value: string): string {
  return value
    .replace(EMAIL, "[email]")
    .replace(JWT, "[token]")
    .replace(SECRET_ASSIGN, "$1=[secret]")
    .replace(UUID, "[id]")
    .replace(QUERY, "[query]")
    .slice(0, 500);
}

const BLOCKED_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "cookies",
  "email",
  "username",
  "ip",
  "studentid",
  "displayname",
  "request",
  "user",
]);

export type MonitorEvent = { digest?: string; message?: string };

export type MonitorPayload = { message: string };

/**
 * Builds the only object that may be sent to error monitoring.
 * Digests are opaque. Free text is scrubbed. User, request and cookies are not accepted.
 */
export function buildMonitorPayload(event: MonitorEvent): MonitorPayload | null {
  const digest =
    event.digest && /^[A-Za-z0-9_-]{1,80}$/.test(event.digest) ? event.digest : undefined;
  const message = event.message ? scrubText(event.message).trim() : "";
  if (!digest && message.length === 0) return null;
  const text = [digest ? `digest:${digest}` : "", message].filter(Boolean).join(" ");
  return { message: text.slice(0, 500) };
}

export function payloadHasBlockedFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(payloadHasBlockedFields);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => {
    if (BLOCKED_KEYS.has(key.toLowerCase())) return true;
    return payloadHasBlockedFields(child);
  });
}
