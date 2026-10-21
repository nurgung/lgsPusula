import "server-only";
import { createSessionClient } from "@/services/supabase/server-client";
import {
  openStudyReminder,
  readMascotSpecies,
  readNotificationPreferences,
  readOpenReviewExam,
  readRewardEvents,
  syncMascotRewards,
  type StoredPreferences,
  type StoredReward,
} from "@/services/supabase/mascot-store";
import {
  DEFAULT_MAX_PER_DAY,
  DEFAULT_QUIET_END,
  DEFAULT_QUIET_START,
} from "./constants";
import type { SpeciesCode } from "./species";

export type MascotState = {
  species: SpeciesCode | null;
  rewards: StoredReward[];
  preferences: StoredPreferences;
  reviewExamId: string | null;
  reminderId: string | null;
};

export type MascotSummary = {
  species: SpeciesCode | null;
  rewards: StoredReward[];
};

const DEFAULT_PREFERENCES: StoredPreferences = {
  enabled: true,
  quietStart: DEFAULT_QUIET_START,
  quietEnd: DEFAULT_QUIET_END,
  maxPerDay: DEFAULT_MAX_PER_DAY,
};

/**
 * Reads the signed-in student. Sync runs first so a repeated visit does not add
 * a second award. The reminder is opened only on the home page.
 */
export async function loadOwnMascot(
  studentId: string,
  options: { openReminder: boolean },
): Promise<MascotState> {
  const session = await createSessionClient({ writable: false });
  await syncMascotRewards(session);
  const [species, rewards, storedPreferences, reviewExamId, reminderId] = await Promise.all([
    readMascotSpecies(session, studentId),
    readRewardEvents(session, studentId),
    readNotificationPreferences(session, studentId),
    readOpenReviewExam(session),
    options.openReminder ? openStudyReminder(session) : Promise.resolve(null),
  ]);
  return {
    species,
    rewards,
    preferences: storedPreferences ?? DEFAULT_PREFERENCES,
    reviewExamId,
    reminderId,
  };
}

/** Read-only. Does not award points and does not open a reminder. */
export async function loadMascotSummary(studentId: string): Promise<MascotSummary> {
  const session = await createSessionClient({ writable: false });
  const [species, rewards] = await Promise.all([
    readMascotSpecies(session, studentId),
    readRewardEvents(session, studentId),
  ]);
  return { species, rewards };
}
