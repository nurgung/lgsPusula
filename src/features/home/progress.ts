import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgressSnapshot } from "@/features/home/celebration";
import { badgesFor, totalPoints } from "@/features/mascot/rules";
import { readRewardEvents } from "@/services/supabase/mascot-store";
import { listStudyGoals, listStudyLogs } from "@/services/supabase/study-store";

export async function readProgressSnapshot(
  client: SupabaseClient,
  studentId: string,
  today: string,
): Promise<ProgressSnapshot> {
  const [rewards, logs, goals] = await Promise.all([
    readRewardEvents(client, studentId),
    listStudyLogs(client, studentId, { from: today, to: today }),
    listStudyGoals(client, studentId),
  ]);
  const daily = goals.find((goal) => goal.period === "day" && goal.subjectId == null);
  return {
    points: totalPoints(rewards),
    badgeIds: badgesFor(rewards)
      .filter((badge) => badge.earned)
      .map((badge) => badge.id),
    dailyGoalTarget: daily?.targetQuestions ?? null,
    todayQuestionCount: logs.reduce((sum, log) => sum + log.questionCount, 0),
  };
}
