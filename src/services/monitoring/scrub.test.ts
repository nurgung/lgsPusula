import { describe, expect, it } from "vitest";
import { buildMonitorPayload, payloadHasBlockedFields, scrubText } from "./scrub";

describe("scrubText", () => {
  it("removes email, tokens, ids and query strings", () => {
    const raw =
      "user ada@okul.example failed password=gizli token=abc uuid 123e4567-e89b-12d3-a456-426614174000 ?code=davet eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturevalue";
    const clean = scrubText(raw);
    expect(clean).not.toContain("ada@okul.example");
    expect(clean).not.toContain("gizli");
    expect(clean).not.toContain("123e4567");
    expect(clean).not.toContain("code=davet");
    expect(clean).not.toContain("eyJ");
    expect(clean).toContain("[email]");
    expect(clean).toContain("[secret]");
    expect(clean).toContain("[id]");
  });
});

describe("buildMonitorPayload", () => {
  it("sends a digest without a message", () => {
    expect(buildMonitorPayload({ digest: "abc_12" })).toEqual({
      message: "digest:abc_12",
    });
  });

  it("drops a digest that could carry free text", () => {
    expect(buildMonitorPayload({ digest: "ada@okul.example" })).toBeNull();
  });

  it("scrubs a server message and never adds user or request fields", () => {
    const payload = buildMonitorPayload({
      digest: "route1",
      message: "cookie=session-value for ada@okul.example",
    });
    expect(payload?.message).not.toContain("session-value");
    expect(payload?.message).not.toContain("ada@");
    expect(payloadHasBlockedFields(payload)).toBe(false);
  });
});
