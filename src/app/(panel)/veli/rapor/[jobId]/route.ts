import { connection } from "next/server";
import { z } from "zod";
import { requireParent } from "@/features/access/guards";
import { loadOwnFamilyLinks } from "@/features/family/load-links";
import { canDownloadReport } from "@/features/reports/access";
import { isDownloadablePdf } from "@/features/reports/bytes";
import { REPORT_MESSAGES } from "@/features/reports/messages";
import { getReportJob, purgeExpiredReportJobs } from "@/services/supabase/report-store";
import { createServiceClient } from "@/services/supabase/server-client";

/** Reads the session on every request; a cached redirect to login would lock everyone out. */
export const instant = false;

function refusal(): Response {
  const body = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Rapor indirilemedi</title></head><body><h1>Rapor indirilemedi</h1><p>${REPORT_MESSAGES.notReady}</p></body></html>`;
  return new Response(body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  await connection();
  const { jobId } = await context.params;
  if (!z.uuid().safeParse(jobId).success) return refusal();

  const user = await requireParent();
  const service = createServiceClient();
  await purgeExpiredReportJobs(service);
  const job = await getReportJob(service, jobId);
  if (!job) return refusal();

  const links = await loadOwnFamilyLinks();
  const activeLinks = links
    .filter((link) => link.status === "active")
    .map((link) => ({ studentId: link.student_id, parentId: link.parent_id }));
  const allowed = canDownloadReport({
    actor: user,
    requestedBy: job.requestedBy,
    studentId: job.studentId,
    status: job.status,
    expiresAt: job.expiresAt,
    bytes: job.bytes,
    activeLinks,
    now: new Date(),
  });
  if (!allowed || !isDownloadablePdf(job.bytes)) return refusal();

  return new Response(Buffer.from(job.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="lgs-pusula-haftalik-rapor.pdf"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
