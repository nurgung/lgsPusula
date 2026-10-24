import "server-only";
import { growthNoticeContent, type GrowthNoticePlan } from "@/features/mascot/growth";
import { openGrowthNotice, MascotStoreError } from "@/services/supabase/mascot-store";
import { createSessionClient } from "@/services/supabase/server-client";

export type OpenGrowthNotice = {
  id: string;
  title: string;
  body: string;
};

/**
 * Opens each planned notice once. A second call returns the same undismissed row
 * or nothing once the student has hidden it. This is an in-app row, not a phone alert.
 */
export async function openGrowthNotices(
  plans: readonly GrowthNoticePlan[],
  stageName: string,
): Promise<OpenGrowthNotice[]> {
  if (plans.length === 0) return [];
  try {
    const session = await createSessionClient({ writable: false });
    const opened: OpenGrowthNotice[] = [];
    for (const plan of plans) {
      const id = await openGrowthNotice(session, plan.kind, plan.noticeDate);
      if (!id) continue;
      const copy = growthNoticeContent(plan.kind, stageName);
      opened.push({ id, title: copy.title, body: copy.body });
    }
    return opened;
  } catch (error) {
    if (!(error instanceof MascotStoreError)) throw error;
    console.error(error.message);
    return [];
  }
}
