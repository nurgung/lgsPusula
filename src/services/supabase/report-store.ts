import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  REPORT_TTL_MS,
  REPORT_TYPE,
  type ReportFailureCode,
  type ReportType,
} from "@/features/reports/constants";
import { decodeBytea, encodeBytea } from "@/features/reports/bytes";

export class ReportStoreError extends Error {
  constructor(operation: string, code?: string) {
    super(`Report operation failed: ${operation}${code ? ` (${code})` : ""}`);
    this.name = "ReportStoreError";
  }
}

const idSchema = z.object({ id: z.uuid() });

const jobSchema = z.object({
  id: z.uuid(),
  student_id: z.uuid(),
  requested_by: z.uuid(),
  status: z.enum(["ready", "failed"]),
  expires_at: z.string(),
  pdf_bytes: z.string().nullable(),
});

export type StoredReportJob = {
  id: string;
  studentId: string;
  requestedBy: string;
  status: "ready" | "failed";
  expiresAt: Date;
  bytes: Uint8Array | null;
};

export async function purgeExpiredReportJobs(client: SupabaseClient): Promise<void> {
  const { error } = await client.rpc("purge_expired_report_jobs");
  if (error) throw new ReportStoreError("purge_expired_report_jobs", error.code);
}

export async function saveReportJob(
  client: SupabaseClient,
  input: {
    studentId: string;
    requestedBy: string;
    periodFrom: string;
    periodTo: string;
    status: "ready" | "failed";
    bytes: Uint8Array | null;
    failureCode: ReportFailureCode | null;
    reportType?: ReportType;
  },
): Promise<string> {
  const now = new Date();
  const { data, error } = await client
    .from("report_jobs")
    .upsert(
      {
        student_id: input.studentId,
        requested_by: input.requestedBy,
        report_type: input.reportType ?? REPORT_TYPE,
        period_from: input.periodFrom,
        period_to: input.periodTo,
        status: input.status,
        pdf_bytes: input.bytes ? encodeBytea(input.bytes) : null,
        byte_size: input.bytes?.byteLength ?? 0,
        failure_code: input.failureCode,
        storage_kind: "database",
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + REPORT_TTL_MS).toISOString(),
      },
      { onConflict: "requested_by,student_id,report_type,period_from,period_to" },
    )
    .select("id")
    .single();
  if (error) throw new ReportStoreError("save_report_job", error.code);
  return idSchema.parse(data).id;
}

export async function getReportJob(
  client: SupabaseClient,
  jobId: string,
): Promise<StoredReportJob | null> {
  const { data, error } = await client
    .from("report_jobs")
    .select("id, student_id, requested_by, status, expires_at, pdf_bytes")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new ReportStoreError("get_report_job", error.code);
  if (!data) return null;
  const row = jobSchema.parse(data);
  const expiresAt = new Date(row.expires_at);
  if (Number.isNaN(expiresAt.getTime())) throw new ReportStoreError("get_report_job");
  return {
    id: row.id,
    studentId: row.student_id,
    requestedBy: row.requested_by,
    status: row.status,
    expiresAt,
    bytes: decodeBytea(row.pdf_bytes),
  };
}
