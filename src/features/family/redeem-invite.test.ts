import { describe, expect, it } from "vitest";
import { RATE_LIMITS } from "@/features/auth/rate-limit";
import { FakeAuditLog, FakeRateLimiter } from "@/features/auth/testing/fakes";
import { hashInviteCode } from "./invite-code";
import { attemptRedeemInvite, type RedeemResultCode } from "./redeem-invite";

const SECRET = "test-secret";

function setup(result: RedeemResultCode | "throw" = "ok") {
  const rateLimiter = new FakeRateLimiter();
  const audit = new FakeAuditLog();
  const hashes: string[] = [];
  return {
    audit,
    hashes,
    deps: {
      rateLimiter,
      audit,
      rateLimitSecret: SECRET,
      redeem: async (_parentId: string, codeHash: string) => {
        hashes.push(codeHash);
        if (result === "throw") throw new Error("db");
        return result;
      },
    },
  };
}

describe("attemptRedeemInvite", () => {
  it("sends the hash, not the code, and records success without the code", async () => {
    const { deps, hashes, audit } = setup("ok");
    const result = await attemptRedeemInvite(
      { parentId: "parent-1", code: "abcd-efgh-jkmn", clientIp: "198.18.0.1" },
      deps,
    );
    expect(result).toEqual({ status: "success" });
    expect(hashes).toEqual([hashInviteCode("ABCDEFGHJKMN", SECRET)]);
    expect(JSON.stringify(audit.events)).not.toContain("ABCD");
  });

  it("rejects a malformed code before asking the database", async () => {
    const { deps, hashes } = setup("ok");
    const result = await attemptRedeemInvite(
      { parentId: "parent-1", code: "kısa", clientIp: "198.18.0.1" },
      deps,
    );
    expect(result).toEqual({ status: "invalid" });
    expect(hashes).toEqual([]);
  });

  it("maps expired, taken and forbidden results", async () => {
    expect(
      (
        await attemptRedeemInvite(
          { parentId: "p", code: "ABCD-EFGH-JKMN", clientIp: "1" },
          setup("expired").deps,
        )
      ).status,
    ).toBe("expired");
    expect(
      (
        await attemptRedeemInvite(
          { parentId: "p", code: "ABCD-EFGH-JKMN", clientIp: "1" },
          setup("already_active").deps,
        )
      ).status,
    ).toBe("already_active");
    expect(
      (
        await attemptRedeemInvite(
          { parentId: "p", code: "ABCD-EFGH-JKMN", clientIp: "1" },
          setup("self").deps,
        )
      ).status,
    ).toBe("not_allowed");
  });

  it("locks the parent account after too many attempts", async () => {
    const { deps, hashes } = setup("invalid");
    for (let i = 0; i < RATE_LIMITS.inviteRedeemByUser.maxAttempts; i++) {
      await attemptRedeemInvite(
        { parentId: "parent-1", code: "ABCD-EFGH-JKMN", clientIp: "198.18.0.1" },
        deps,
      );
    }
    const blocked = await attemptRedeemInvite(
      { parentId: "parent-1", code: "ABCD-EFGH-JKMN", clientIp: "198.18.0.1" },
      deps,
    );
    expect(blocked.status).toBe("rate_limited");
    expect(hashes).toHaveLength(RATE_LIMITS.inviteRedeemByUser.maxAttempts);
  });
});
