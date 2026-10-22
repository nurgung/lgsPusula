import { randomBytes } from "node:crypto";

export type CspMode = "development" | "production";

/** 128 bits. Unique per HTML response so a guessed nonce cannot run an injected script. */
export function createNonce(): string {
  return randomBytes(16).toString("base64");
}

export function buildContentSecurityPolicy(nonce: string, mode: CspMode): string {
  if (!/^[A-Za-z0-9+/]{22}==$/.test(nonce)) {
    throw new Error("Invalid CSP nonce.");
  }

  const development = mode === "development";
  const scriptSrc = [
    "script-src 'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    development ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");
  // React's development overlay injects styles. Production allows only nonced style tags.
  // Style attributes stay blocked in production (`style-src-attr 'none'`).
  const styleSrc = development
    ? "style-src 'self' 'unsafe-inline'"
    : `style-src 'self' 'nonce-${nonce}'`;
  const styleAttr = development
    ? "style-src-attr 'unsafe-inline'"
    : "style-src-attr 'none'";
  const connectSrc = development ? "connect-src 'self' ws: wss:" : "connect-src 'self'";

  return [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    styleAttr,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    connectSrc,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    development ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}
