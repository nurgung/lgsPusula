import "server-only";
import { loadCoachingReport } from "@/features/coaching/load-coaching";
import { loadExamList } from "@/features/exams/load-exams";
import { loadStudyRecords } from "@/features/study/load-study";
import { buildWeeklyReportBlocks } from "./document";
import type { Block } from "./layout";
import {
  parentOverviewWindow,
  weeklyReportWindow,
  type WeeklyReportPeriod,
} from "./periods";

/** Shared weekly report body for PDF and DOCX. The caller has already checked the link. */
export async function loadWeeklyBlocks(input: {
  studentId: string;
  studentName: string;
  period: WeeklyReportPeriod;
  today: string;
}): Promise<{ blocks: Block[]; periodFrom: string; periodTo: string }> {
  const periodWindow = weeklyReportWindow(input.today, input.period);
  const overview = parentOverviewWindow(input.today);
  const readWindow = {
    from: overview.from < periodWindow.from ? overview.from : periodWindow.from,
    to: overview.to > periodWindow.to ? overview.to : periodWindow.to,
  };
  const [study, exams, coaching] = await Promise.all([
    loadStudyRecords(input.studentId, readWindow),
    loadExamList(input.studentId, readWindow),
    loadCoachingReport(input.studentId, input.today),
  ]);
  return {
    periodFrom: periodWindow.from,
    periodTo: periodWindow.to,
    blocks: buildWeeklyReportBlocks({
      studentName: input.studentName,
      generatedAt: new Date(),
      period: input.period,
      today: input.today,
      logs: study.logs,
      goals: study.goals,
      exams: exams.map((exam) => ({
        title: exam.title,
        takenOn: exam.takenOn,
        examType: exam.examType,
        totalNet: exam.totalNet,
        ruleVersion: exam.ruleVersion,
      })),
      suggestion: {
        message: coaching.recommendation.message,
        reason: coaching.recommendation.reason,
        evidence: coaching.recommendation.evidence,
      },
    }),
  };
}
