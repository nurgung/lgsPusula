import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, createTestAccount, isAuthConfigured } from "./support/auth.ts";

test.skip(
  !isAuthConfigured(),
  "Supabase is not configured (see README: yerel Supabase).",
);

test("retention deletes expired rows and keeps a fresh audit event", async () => {
  const student = await createTestAccount();
  const yearAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const client = admin();

  const oldAudit = await client
    .from("audit_events")
    .insert({
      occurred_at: yearAgo,
      event_type: "auth.login",
      actor_id: student.id,
      outcome: "success",
      metadata: {},
    })
    .select("id")
    .single();
  expect(oldAudit.error).toBeNull();

  const freshAudit = await client
    .from("audit_events")
    .insert({
      event_type: "auth.logout",
      actor_id: student.id,
      outcome: "success",
      metadata: {},
    })
    .select("id")
    .single();
  expect(freshAudit.error).toBeNull();

  const invite = await client
    .from("family_invites")
    .insert({
      student_id: student.id,
      code_hash: randomBytes(32).toString("hex"),
      created_at: weekAgo,
      expires_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      consumed_at: weekAgo,
    })
    .select("id")
    .single();
  expect(invite.error).toBeNull();

  const bucket = `e2e${randomBytes(8).toString("hex")}`;
  const limit = await client.from("auth_rate_limits").insert({
    bucket_key: bucket,
    window_started_at: weekAgo,
    attempt_count: 1,
  });
  expect(limit.error).toBeNull();

  const purged = await client.rpc("purge_retained_rows");
  expect(purged.error).toBeNull();

  const oldRow = await client
    .from("audit_events")
    .select("id")
    .eq("id", oldAudit.data?.id)
    .maybeSingle();
  expect(oldRow.data).toBeNull();
  const freshRow = await client
    .from("audit_events")
    .select("id")
    .eq("id", freshAudit.data?.id)
    .maybeSingle();
  expect(freshRow.data?.id).toBe(freshAudit.data?.id);

  const inviteRow = await client
    .from("family_invites")
    .select("id")
    .eq("id", invite.data?.id)
    .maybeSingle();
  expect(inviteRow.data).toBeNull();

  const limitRow = await client
    .from("auth_rate_limits")
    .select("bucket_key")
    .eq("bucket_key", bucket)
    .maybeSingle();
  expect(limitRow.data).toBeNull();
});
