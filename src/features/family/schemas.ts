import { z } from "zod";

export const FAMILY_LINK_STATUSES = [
  "pending",
  "active",
  "declined",
  "expired",
  "revoked",
] as const;
export type FamilyLinkStatus = (typeof FAMILY_LINK_STATUSES)[number];

export const inviteCodeSchema = z.object({
  code: z.string().trim().min(1, "Davet kodunu yaz.").max(40),
});

export const linkIdSchema = z.object({
  linkId: z.uuid(),
});

export const respondLinkSchema = linkIdSchema.extend({
  decision: z.enum(["approve", "decline"]),
});

export const visibleLinkSchema = z.object({
  id: z.uuid(),
  student_id: z.uuid(),
  parent_id: z.uuid(),
  status: z.enum(FAMILY_LINK_STATUSES),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  responded_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  student_display_name: z.string(),
  parent_display_name: z.string(),
});

export type VisibleFamilyLink = z.infer<typeof visibleLinkSchema>;
