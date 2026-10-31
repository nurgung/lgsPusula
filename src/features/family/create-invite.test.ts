import { describe, expect, it } from "vitest";
import { RATE_LIMITS } from "@/features/auth/rate-limit";
import { FakeAuditLog, FakeRateLimiter } from "@/features/auth/testing/fakes";
import { attemptCreateInvite } from "./create-invite";
import { hashInviteCode } from "./invite-code";

const SECRET = "test-secret";

function deps() {
  const rateLimiter = new FakeRateLimiter();
  const audit = new FakeAuditLog();
  const stored: { hash: string; expiresAt: Date }[] = [];
  return {
    rateLimiter,
    audit,
    stored,
    base: {
      rateLimiter,
      audit,
      rateLimitSecret: SECRET,
      now: new Date("2026-10-13T09:00:00Z"),
      generateCode: () => "ABCD-EFGH-JKMN",
      createInvite: async (_studentId: string, hash: string, expiresAt: Date) => {
        stored.push({ hash, expiresAt });
      },
    },
  };
}

describe("attemptCreateInvite", () => {
  it("returns the code once and stores only its hash", async () => {
    const { base, stored, audit } = deps();
    const result = await attemptCreateInvite({ studentId: "student-1" }, base);
    expect(result).toEqual({ status: "success", code: "ABCD-EFGH-JKMN" });
    expect(stored).toEqual([
      {
        hash: hashInviteCode("ABCDEFGHJKMN", SECRET),
        expiresAt: new Date("2026-10-14T09:00:00Z"),
      },
    ]);
    expect(JSON.stringify(audit.events)).not.toContain("ABCD");
    expect(audit.events).toEqual([
      { type: "family.invite_create", outcome: "success", actorId: "student-1" },
    ]);
  });

  it("stops after the per-student limit and does not create another code", async () => {
    const { base, stored } = deps();
    for (let i = 0; i < RATE_LIMITS.inviteCreateByUser.maxAttempts; i++) {
      expect((await attemptCreateInvite({ studentId: "student-1" }, base)).status).toBe(
        "success",
      );
    }
    const blocked = await attemptCreateInvite({ studentId: "student-1" }, base);
    expect(blocked).toMatchObject({ status: "rate_limited" });
    expect(stored).toHaveLength(RATE_LIMITS.inviteCreateByUser.maxAttempts);
  });

  it("hashes the invite with inviteSecret when it differs from the rate-limit secret", async () => {
    const inviteSecret = "invite-secret-invite-secret-invite";
    const { base, stored } = deps();
    const result = await attemptCreateInvite(
      { studentId: "student-1" },
      { ...base, inviteSecret },
    );
    expect(result).toEqual({ status: "success", code: "ABCD-EFGH-JKMN" });
    expect(stored[0]?.hash).toBe(hashInviteCode("ABCDEFGHJKMN", inviteSecret));
    expect(stored[0]?.hash).not.toBe(hashInviteCode("ABCDEFGHJKMN", SECRET));
  });
});
