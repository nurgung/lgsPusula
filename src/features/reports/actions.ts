"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireParent } from "@/features/access/guards";
import { retryAfterMinutes, RATE_LIMITS, rateLimitKey } from "@/features/auth/rate-limit";
import { loadCoachingReport } from "@/features/coaching/load-coaching";
import { loadExamList } from "@/features/exams/load-exams";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { istanbulToday } from "@/features/study/calendar";
import { loadStudyRecords } from "@/features/study/load-study";
import {
  AuthProviderError,
  createAuditLog,
  createRateLimiter,
} from "@/services/supabase/auth-adapters";
import { requireSupabaseConfig } from "@/services/supabase/config";
import {
  purgeExpiredReportJobs,
  ReportStoreError,
  saveReportJob,
} from "@/services/supabase/report-store";
import { createServiceClient } from "@/services/supabase/server-client";
import { canRequestReport } from "./access";
import { classifyReportBytes } from "./bytes";
import { buildWeeklyReportBlocks } from "./document";
import type { ReportFormState } from "./form-state";
import { REPORT_MESSAGES } from "./messages";
import { renderReportPdf } from "./pdf";
import { parentOverviewWindow, weeklyReportWindow } from "./periods";

const requestSchema = z.object({
  studentId: z.uuid(),
  period: z.enum(["current", "previous"]),
});

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export async function requestWeeklyReportAction(
  _previous: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const user = await requireParent();
  const parsed = requestSchema.safeParse({
    studentId: field(formData, "studentId"),
    period: field(formData, "period"),
  });
  if (!parsed.success) return { status: "error", message: REPORT_MESSAGES.formInvalid };

  const links = await loadOwnFamilyLinks();
  const activeLinks = links
    .filter((link) => link.status === "active")
    .map((link) => ({ studentId: link.student_id, parentId: link.parent_id }));
  if (!canRequestReport(user, parsed.data.studentId, activeLinks)) notFound();
  const link = links.find(
    (item) => item.student_id === parsed.data.studentId && item.status === "active",
  );
  if (!link) notFound();

  const service = createServiceClient();
  const audit = createAuditLog(service);
  try {
    const decision = await createRateLimiter(service).consume(
      rateLimitKey("report_generate:user", user.id, requireSupabaseConfig().authSecret),
      RATE_LIMITS.reportGenerateByUser,
    );
    if (!decision.allowed) {
      await audit.record({
        type: "report.generate",
        outcome: "blocked",
        actorId: user.id,
        metadata: { reason: "rate_limited" },
      });
      return {
        status: "error",
        message: REPORT_MESSAGES.rateLimited(
          retryAfterMinutes(decision.retryAfterSeconds),
        ),
      };
    }

    await purgeExpiredReportJobs(service);
    const today = istanbulToday();
    const periodWindow = weeklyReportWindow(today, parsed.data.period);
    const overview = parentOverviewWindow(today);
    const readWindow = {
      from: overview.from < periodWindow.from ? overview.from : periodWindow.from,
      to: overview.to > periodWindow.to ? overview.to : periodWindow.to,
    };
    const [study, exams, coaching] = await Promise.all([
      loadStudyRecords(parsed.data.studentId, readWindow),
      loadExamList(parsed.data.studentId, readWindow),
      loadCoachingReport(parsed.data.studentId, today),
    ]);
    const blocks = buildWeeklyReportBlocks({
      studentName: link.student_display_name,
      generatedAt: new Date(),
      period: parsed.data.period,
      today,
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
    });

    let rendered: Uint8Array | null = null;
    let renderFailed = false;
    try {
      rendered = await renderReportPdf(blocks);
    } catch {
      console.error("report render failed");
      renderFailed = true;
    }
    const classified = classifyReportBytes(rendered, renderFailed);
    const jobId = await saveReportJob(service, {
      studentId: parsed.data.studentId,
      requestedBy: user.id,
      periodFrom: periodWindow.from,
      periodTo: periodWindow.to,
      status: classified.ok ? "ready" : "failed",
      bytes: classified.ok ? classified.bytes : null,
      failureCode: classified.ok ? null : classified.failureCode,
    });
    if (!classified.ok) {
      await audit.record({
        type: "report.generate",
        outcome: "failure",
        actorId: user.id,
        metadata: { reason: classified.failureCode },
      });
      return {
        status: "error",
        message:
          classified.failureCode === "empty_document"
            ? REPORT_MESSAGES.emptyDocument
            : REPORT_MESSAGES.generationFailed,
      };
    }
    await audit.record({ type: "report.generate", outcome: "success", actorId: user.id });
    redirect(`/veli/rapor/${jobId}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    if (error instanceof AuthProviderError || error instanceof ReportStoreError) {
      console.error(error.message);
      return { status: "error", message: REPORT_MESSAGES.providerError };
    }
    throw error;
  }
}
