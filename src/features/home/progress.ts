import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgressSnapshot } from "@/features/home/celebration";
import { evaluateGrowth } from "@/features/mascot/growth";
import { badgesFor, totalPoints } from "@/features/mascot/rules";
import { readRewardEvents } from "@/services/supabase/mascot-store";
import {
  listStudyContributions,
  listStudyGoals,
  listStudyLogs,
} from "@/services/supabase/study-store";
import { STUDY_DATE_MIN } from "@/features/study/calendar";

export async function readProgressSnapshot(
  client: SupabaseClient,
  studentId: string,
  today: string,
): Promise<ProgressSnapshot> {
  const [rewards, logs, goals, contributions] = await Promise.all([
    readRewardEvents(client, studentId),
    listStudyLogs(client, studentId, { from: today, to: today }),
    listStudyGoals(client, studentId),
    listStudyContributions(client, studentId, { from: STUDY_DATE_MIN, to: today }),
  ]);
  const daily = goals.find((goal) => goal.period === "day" && goal.subjectId == null);
  const growth = evaluateGrowth({
    today,
    logs: contributions,
    rewards,
  });
  return {
    points: totalPoints(rewards),
    badgeIds: badgesFor(rewards)
      .filter((badge) => badge.earned)
      .map((badge) => badge.id),
    dailyGoalTarget: daily?.targetQuestions ?? null,
    todayQuestionCount: logs.reduce((sum, log) => sum + log.questionCount, 0),
    stageId: growth.stageId,
  };
}
