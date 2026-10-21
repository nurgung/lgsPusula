import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { RewardEventType } from "@/features/mascot/constants";
import type { SpeciesCode } from "@/features/mascot/species";
import { isSpeciesCode } from "@/features/mascot/species";

export class MascotStoreError extends Error {
  constructor(operation: string, code?: string) {
    super(`Mascot operation failed: ${operation}${code ? ` (${code})` : ""}`);
    this.name = "MascotStoreError";
  }
}

const rewardRowSchema = z.object({
  event_type: z.enum(["study_log", "daily_goal", "exam_saved", "outcome_review"]),
  points: z.number().int().positive(),
  source_date: z.string().nullable(),
  rule_version: z.string(),
});

const profileSchema = z.object({ species: z.string() });

const preferenceSchema = z.object({
  enabled: z.boolean(),
  quiet_start: z.string(),
  quiet_end: z.string(),
  max_per_day: z.number().int(),
});

export type StoredReward = {
  eventType: RewardEventType;
  points: number;
  sourceDate: string | null;
  ruleVersion: string;
};

export type StoredPreferences = {
  enabled: boolean;
  quietStart: string;
  quietEnd: string;
  maxPerDay: number;
};

function fail(error: { code?: string } | null, operation: string): never {
  throw new MascotStoreError(operation, error?.code);
}

export async function readMascotSpecies(
  client: SupabaseClient,
  studentId: string,
): Promise<SpeciesCode | null> {
  const { data, error } = await client
    .from("mascot_profiles")
    .select("species")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) fail(error, "read_profile");
  if (!data) return null;
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success || !isSpeciesCode(parsed.data.species)) {
    throw new MascotStoreError("read_profile");
  }
  return parsed.data.species;
}

export async function readRewardEvents(
  client: SupabaseClient,
  studentId: string,
): Promise<StoredReward[]> {
  const { data, error } = await client
    .from("reward_events")
    .select("event_type, points, source_date, rule_version")
    .eq("student_id", studentId);
  if (error) fail(error, "read_rewards");
  return (data ?? []).map((row) => {
    const parsed = rewardRowSchema.safeParse(row);
    if (!parsed.success) throw new MascotStoreError("read_rewards");
    return {
      eventType: parsed.data.event_type,
      points: parsed.data.points,
      sourceDate: parsed.data.source_date,
      ruleVersion: parsed.data.rule_version,
    };
  });
}

export async function readNotificationPreferences(
  client: SupabaseClient,
  studentId: string,
): Promise<StoredPreferences | null> {
  const { data, error } = await client
    .from("notification_preferences")
    .select("enabled, quiet_start, quiet_end, max_per_day")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) fail(error, "read_preferences");
  if (!data) return null;
  const parsed = preferenceSchema.safeParse(data);
  if (!parsed.success) throw new MascotStoreError("read_preferences");
  return {
    enabled: parsed.data.enabled,
    quietStart: parsed.data.quiet_start.slice(0, 5),
    quietEnd: parsed.data.quiet_end.slice(0, 5),
    maxPerDay: parsed.data.max_per_day,
  };
}

export async function saveMascotSpecies(
  client: SupabaseClient,
  studentId: string,
  species: SpeciesCode,
): Promise<void> {
  const existing = await readMascotSpecies(client, studentId);
  const { error } = existing
    ? await client.from("mascot_profiles").update({ species }).eq("student_id", studentId)
    : await client.from("mascot_profiles").insert({ student_id: studentId, species });
  if (error) fail(error, "save_profile");
}

export async function saveNotificationPreferences(
  client: SupabaseClient,
  studentId: string,
  preferences: StoredPreferences,
): Promise<void> {
  const row = {
    enabled: preferences.enabled,
    quiet_start: preferences.quietStart,
    quiet_end: preferences.quietEnd,
    max_per_day: preferences.maxPerDay,
  };
  const existing = await readNotificationPreferences(client, studentId);
  const { error } = existing
    ? await client.from("notification_preferences").update(row).eq("student_id", studentId)
    : await client
        .from("notification_preferences")
        .insert({ student_id: studentId, ...row });
  if (error) fail(error, "save_preferences");
}

export async function syncMascotRewards(client: SupabaseClient): Promise<void> {
  const { error } = await client.rpc("sync_mascot_rewards");
  if (error) fail(error, "sync_rewards");
}

/** Returns the open reminder id, or null when no reminder should be shown. */
export async function openStudyReminder(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.rpc("open_study_reminder");
  if (error) fail(error, "open_reminder");
  if (data == null) return null;
  const parsed = z.uuid().safeParse(data);
  if (!parsed.success) throw new MascotStoreError("open_reminder");
  return parsed.data;
}

export async function dismissStudyReminder(
  client: SupabaseClient,
  studentId: string,
  noticeId: string,
): Promise<void> {
  const { error } = await client
    .from("in_app_notices")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", noticeId)
    .eq("student_id", studentId);
  if (error) fail(error, "dismiss_reminder");
}

export async function readOpenReviewExam(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.rpc("mascot_open_review_exam");
  if (error) fail(error, "read_review_exam");
  if (data == null) return null;
  const parsed = z.uuid().safeParse(data);
  if (!parsed.success) throw new MascotStoreError("read_review_exam");
  return parsed.data;
}
