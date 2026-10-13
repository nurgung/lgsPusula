import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { REDEEM_RESULTS, type RedeemResultCode } from "@/features/family/redeem-invite";
import { visibleLinkSchema, type VisibleFamilyLink } from "@/features/family/schemas";
import { AuthProviderError } from "./auth-adapters";

const resultSchema = z.enum(REDEEM_RESULTS);
const respondSchema = z.enum([
  "ok",
  "not_found",
  "not_pending",
  "expired",
  "already_active",
]);
const revokeSchema = z.enum(["ok", "not_found", "not_active"]);

export type LinkMutationResult =
  z.infer<typeof respondSchema> | z.infer<typeof revokeSchema>;

function unwrap<T>(data: unknown, schema: z.ZodType<T>, operation: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AuthProviderError(operation);
  return parsed.data;
}

export async function expireStaleFamilyLinks(service: SupabaseClient): Promise<void> {
  const { error } = await service.rpc("expire_stale_family_links");
  if (error) throw new AuthProviderError("expire_family_links");
}

export async function insertFamilyInvite(
  service: SupabaseClient,
  studentId: string,
  codeHash: string,
  expiresAt: Date,
): Promise<void> {
  const { error } = await service.rpc("create_family_invite", {
    p_student_id: studentId,
    p_code_hash: codeHash,
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) throw new AuthProviderError("create_family_invite");
}

export async function redeemFamilyInvite(
  service: SupabaseClient,
  parentId: string,
  codeHash: string,
): Promise<RedeemResultCode> {
  const { data, error } = await service.rpc("redeem_family_invite", {
    p_parent_id: parentId,
    p_code_hash: codeHash,
  });
  if (error) throw new AuthProviderError("redeem_family_invite");
  return unwrap(data, resultSchema, "redeem_family_invite");
}

export async function respondFamilyLink(
  service: SupabaseClient,
  actorId: string,
  linkId: string,
  decision: "approve" | "decline",
) {
  const { data, error } = await service.rpc("respond_family_link", {
    p_actor_id: actorId,
    p_link_id: linkId,
    p_decision: decision,
  });
  if (error) throw new AuthProviderError("respond_family_link");
  return unwrap(data, respondSchema, "respond_family_link");
}

export async function revokeFamilyLink(
  service: SupabaseClient,
  actorId: string,
  linkId: string,
) {
  const { data, error } = await service.rpc("revoke_family_link", {
    p_actor_id: actorId,
    p_link_id: linkId,
  });
  if (error) throw new AuthProviderError("revoke_family_link");
  return unwrap(data, revokeSchema, "revoke_family_link");
}

/** Runs as the signed-in user, so the function only returns that user's links. */
export async function listVisibleFamilyLinks(
  session: SupabaseClient,
): Promise<VisibleFamilyLink[]> {
  const { data, error } = await session.rpc("visible_family_links");
  if (error) throw new AuthProviderError("visible_family_links");
  return z.array(visibleLinkSchema).parse(data ?? []);
}
