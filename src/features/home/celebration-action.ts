"use server";

import { requireStudent } from "@/features/access/guards";
import { tasksFor } from "@/features/mascot/rules";
import { readMascotSpecies, readOpenReviewExam } from "@/services/supabase/mascot-store";
import { requireSupabaseConfig } from "@/services/supabase/config";
import { createSessionClient } from "@/services/supabase/server-client";
import { istanbulToday } from "@/features/study/calendar";
import { listStudyGoals, listStudyLogs } from "@/services/supabase/study-store";
import {
  celebrationCopy,
  celebrationStillHolds,
  type CelebrationCopy,
  type CelebrationView,
} from "./celebration";
import { readCelebration } from "./celebration-token";
import { readProgressSnapshot } from "./progress";

/**
 * Confirms the Tamamlandı marker. The sentence is fixed in code.
 * A goal, badge, or stage marker is rejected here.
 */
export async function resolvePracticeCheer(
  token: string,
): Promise<CelebrationCopy | null> {
  const user = await requireStudent();
  const parsed = readCelebration(token, requireSupabaseConfig().authSecret, Date.now());
  if (!parsed || parsed.studentId !== user.id || parsed.kind.reason !== "practice")
    return null;
  return celebrationCopy(parsed.kind);
}

/** Confirms the one-time marker and rebuilds the Turkish sentence from live rows. */
export async function resolveCelebration(token: string): Promise<CelebrationView | null> {
  const user = await requireStudent();
  const parsed = readCelebration(token, requireSupabaseConfig().authSecret, Date.now());
  if (!parsed || parsed.studentId !== user.id) return null;

  try {
    const session = await createSessionClient({ writable: false });
    const today = istanbulToday();
    const [snapshot, species, reviewExamId, logs, goals] = await Promise.all([
      readProgressSnapshot(session, user.id, today),
      readMascotSpecies(session, user.id),
      readOpenReviewExam(session),
      listStudyLogs(session, user.id, { from: today, to: today }),
      listStudyGoals(session, user.id),
    ]);
    if (!celebrationStillHolds(snapshot, parsed.kind)) return null;

    const copy = celebrationCopy(parsed.kind);
    const dailyGoal = goals.find(
      (goal) => goal.period === "day" && goal.subjectId == null,
    );
    const tasks = tasksFor({
      todayLogCount: logs.length,
      todayQuestionCount: snapshot.todayQuestionCount,
      dailyGoalTarget: dailyGoal?.targetQuestions ?? null,
      reviewExamId,
    });
    return {
      heading: copy.heading,
      detail: copy.detail,
      stageId: snapshot.stageId,
      species,
      tasks: tasks.map((task) => ({ id: task.id, title: task.title, done: task.done })),
    };
  } catch (error) {
    console.error(error instanceof Error ? error.name : "celebration");
    return null;
  }
}
