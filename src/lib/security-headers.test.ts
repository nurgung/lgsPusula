// @vitest-environment node
import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

const header = (key: string) => securityHeaders.find((h) => h.key === key)?.value;

describe("securityHeaders", () => {
  it("prevents MIME sniffing and framing", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("Strict-Transport-Security")).toContain("max-age=63072000");
  });

  it("limits referrer and powerful browser features", () => {
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toContain("camera=()");
    expect(header("Permissions-Policy")).toContain("geolocation=()");
  });
});
