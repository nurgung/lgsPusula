"use server";

import { requireStudent } from "@/features/access/guards";
import { retryAfterMinutes, RATE_LIMITS, rateLimitKey } from "@/features/auth/rate-limit";
import { loadCatalog } from "@/features/curriculum/load-catalog";
import { istanbulToday } from "@/features/study/calendar";
import {
  AuthProviderError,
  createAuditLog,
  createRateLimiter,
} from "@/services/supabase/auth-adapters";
import { requireSupabaseConfig } from "@/services/supabase/config";
import {
  createServiceClient,
  createSessionClient,
} from "@/services/supabase/server-client";
import {
  findStudyLogByRequestId,
  insertStudyLog,
  StudyStoreError,
} from "@/services/supabase/study-store";
import { extractPdfLines, pdfLinesToGrid } from "./pdf-text";
import { readImportGrid } from "./grid";
import { commitPlannedLogs, planStudyImport } from "./plan";

export type ImportPreviewRow = {
  line: number;
  studiedOn: string;
  subjectName: string;
  questionCount: number;
  durationMinutes: number;
};

export type ImportFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "preview";
      ready: ImportPreviewRow[];
      issues: { line: number; message: string }[];
    }
  | { status: "saved"; created: number; unchanged: number };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function importStudyAction(
  _previous: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const user = await requireStudent();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Bir CSV, Excel veya PDF dosyası seç." };
  }
  const service = createServiceClient();
  const audit = createAuditLog(service);
  try {
    const decision = await createRateLimiter(service).consume(
      rateLimitKey("study_import:user", user.id, requireSupabaseConfig().authSecret),
      RATE_LIMITS.importByUser,
    );
    if (!decision.allowed) {
      await audit.record({
        type: "study.import",
        outcome: "blocked",
        actorId: user.id,
        metadata: { reason: "rate_limited" },
      });
      return {
        status: "error",
        message: `Çok fazla deneme. ${retryAfterMinutes(decision.retryAfterSeconds)} dakika sonra tekrar dene.`,
      };
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = file.name.toLowerCase().endsWith(".pdf") || bytes[0] === 0x25;
    let gridResult: { ok: true; grid: string[][] } | { ok: false; message: string };
    if (pdf) {
      const extracted = extractPdfLines(bytes);
      gridResult = extracted.ok
        ? { ok: true, grid: pdfLinesToGrid(extracted.lines) }
        : extracted;
    } else {
      gridResult = readImportGrid(bytes);
    }
    if (!gridResult.ok) return { status: "error", message: gridResult.message };

    const catalog = await loadCatalog({ includeArchived: false });
    const today = istanbulToday();
    const plan = planStudyImport({
      studentId: user.id,
      today,
      subjects: catalog.map((subject) => ({ id: subject.id, name: subject.name })),
      grid: gridResult.grid,
    });
    const names = new Map(catalog.map((subject) => [subject.id, subject.name]));
    const ready = plan.ready.map((row, index) => ({
      line: index + 2,
      studiedOn: row.studiedOn,
      subjectName: names.get(row.subjectId) ?? "Ders",
      questionCount: row.questionCount,
      durationMinutes: row.durationMinutes,
    }));

    if (text(formData, "confirm") !== "evet") {
      return { status: "preview", ready, issues: plan.issues };
    }
    if (plan.ready.length === 0) {
      return {
        status: "error",
        message: "Kaydedilecek sağlam satır yok. Önce satır notlarına bak.",
      };
    }

    const session = await createSessionClient({ writable: true });
    const saved = await commitPlannedLogs(user.id, plan.ready, {
      insert: (row) => insertStudyLog(session, row),
      findByRequestId: (studentId, requestId) =>
        findStudyLogByRequestId(session, studentId, requestId),
    });
    if ("refused" in saved) {
      await audit.record({
        type: "study.import",
        outcome: "blocked",
        actorId: user.id,
        metadata: { reason: "not_allowed" },
      });
      return { status: "error", message: "Bu satırlar senin hesabına yazılamadı." };
    }
    await audit.record({ type: "study.import", outcome: "success", actorId: user.id });
    return { status: "saved", created: saved.created, unchanged: saved.unchanged };
  } catch (error) {
    if (error instanceof AuthProviderError || error instanceof StudyStoreError) {
      console.error(error.message);
      return {
        status: "error",
        message: "Dosya şu an kaydedilemedi. Biraz sonra tekrar dene.",
      };
    }
    throw error;
  }
}
