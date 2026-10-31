import "server-only";
import { loadCoachingReport } from "@/features/coaching/load-coaching";
import { loadExamListWithSubjects } from "@/features/exams/load-exams";
import { loadOutcomePriorities } from "@/features/outcomes/load-analysis";
import { loadStudyRecords } from "@/features/study/load-study";
import { buildWeeklyReportBlocks, reportPdfMeta } from "./document";
import type { Block } from "./layout";
import {
  parentOverviewWindow,
  reportPeriodWindow,
  reportTypeForScope,
  type ReportPeriodChoice,
  type ReportScope,
} from "./periods";
import { buildWeeklyReportModel } from "./weekly-model";

/** Shared report body for PDF and DOCX. The caller has already checked the link. */
export async function loadWeeklyBlocks(input: {
  studentId: string;
  studentName: string;
  period: ReportPeriodChoice;
  today: string;
  scope?: ReportScope;
}): Promise<{
  blocks: Block[];
  periodFrom: string;
  periodTo: string;
  reportType: "weekly_pdf" | "monthly_pdf";
  headerTitle: string;
  headerSubtitle: string;
}> {
  const scope = input.scope ?? "week";
  const periodWindow = reportPeriodWindow(input.today, scope, input.period);
  const overview = parentOverviewWindow(input.today);
  const readWindow = {
    from: overview.from < periodWindow.from ? overview.from : periodWindow.from,
    to: overview.to > periodWindow.to ? overview.to : periodWindow.to,
  };
  const [study, exams, coaching, outcomes] = await Promise.all([
    loadStudyRecords(input.studentId, readWindow),
    loadExamListWithSubjects(input.studentId, readWindow),
    loadCoachingReport(input.studentId, input.today),
    loadOutcomePriorities(input.studentId, periodWindow),
  ]);
  const reportInput = {
    studentName: input.studentName,
    generatedAt: new Date(),
    period: input.period,
    today: input.today,
    scope,
    logs: study.logs,
    goals: study.goals,
    exams: exams.map((exam) => ({
      title: exam.title,
      takenOn: exam.takenOn,
      examType: exam.examType,
      totalNet: exam.totalNet,
      score: exam.score,
      ruleVersion: exam.ruleVersion,
      subjects: exam.subjects.map((subject) => ({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        net: subject.net,
      })),
    })),
    outcomes,
    suggestion: {
      message: coaching.recommendation.message,
      reason: coaching.recommendation.reason,
      evidence: coaching.recommendation.evidence,
    },
  };
  const model = buildWeeklyReportModel(reportInput);
  const meta = reportPdfMeta(model);
  return {
    periodFrom: periodWindow.from,
    periodTo: periodWindow.to,
    reportType: reportTypeForScope(scope),
    headerTitle: meta.headerTitle,
    headerSubtitle: meta.headerSubtitle,
    blocks: buildWeeklyReportBlocks(reportInput),
  };
}
