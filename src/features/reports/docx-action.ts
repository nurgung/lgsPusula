"use server";

import { notFound } from "next/navigation";
import { z } from "zod";
import { requireParent } from "@/features/access/guards";
import { retryAfterMinutes, RATE_LIMITS, rateLimitKey } from "@/features/auth/rate-limit";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { istanbulToday } from "@/features/study/calendar";
import {
  AuthProviderError,
  createAuditLog,
  createRateLimiter,
} from "@/services/supabase/auth-adapters";
import { requireSupabaseConfig } from "@/services/supabase/config";
import { createServiceClient } from "@/services/supabase/server-client";
import { canRequestReport } from "./access";
import { renderReportDocx } from "./docx";
import { loadWeeklyBlocks } from "./load-weekly";
import { REPORT_MESSAGES } from "./messages";
import type { ReportScope } from "./periods";

const requestSchema = z.object({
  studentId: z.uuid(),
  period: z.enum(["current", "previous"]),
  scope: z.enum(["week", "month"]).default("week"),
});

export type DocxFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "file"; base64: string; filename: string };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function requestWeeklyDocxAction(
  _previous: DocxFormState,
  formData: FormData,
): Promise<DocxFormState> {
  const user = await requireParent();
  const parsed = requestSchema.safeParse({
    studentId: field(formData, "studentId"),
    period: field(formData, "period"),
    scope: field(formData, "scope") || "week",
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
    const scope = parsed.data.scope as ReportScope;
    const weekly = await loadWeeklyBlocks({
      studentId: parsed.data.studentId,
      studentName: link.student_display_name,
      period: parsed.data.period,
      today: istanbulToday(),
      scope,
    });
    const bytes = renderReportDocx(weekly.blocks);
    if (bytes.byteLength < 400) {
      await audit.record({
        type: "report.generate",
        outcome: "failure",
        actorId: user.id,
        metadata: { reason: "empty_document" },
      });
      return { status: "error", message: REPORT_MESSAGES.emptyDocument };
    }
    await audit.record({ type: "report.generate", outcome: "success", actorId: user.id });
    return {
      status: "file",
      base64: Buffer.from(bytes).toString("base64"),
      filename:
        scope === "month" ? "lgs-pusula-ay.docx" : "lgs-pusula-hafta.docx",
    };
  } catch (error) {
    if (error instanceof AuthProviderError) {
      console.error(error.message);
      return { status: "error", message: REPORT_MESSAGES.providerError };
    }
    throw error;
  }
}
