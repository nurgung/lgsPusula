// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, createNonce } from "./csp";

describe("buildContentSecurityPolicy", () => {
  const nonce = createNonce();

  it("binds scripts to a fresh nonce and blocks framing", () => {
    const csp = buildContentSecurityPolicy(nonce, "production");
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("does not allow eval or inline styles in production", () => {
    const csp = buildContentSecurityPolicy(nonce, "production");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).toContain("style-src-attr 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("ws:");
  });

  it("relaxes only the development directives React and the dev server need", () => {
    const csp = buildContentSecurityPolicy(nonce, "development");
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("connect-src 'self' ws: wss:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("rejects a nonce that was not just generated", () => {
    expect(() => buildContentSecurityPolicy("short", "production")).toThrow(
      /Invalid CSP nonce/,
    );
  });
});
