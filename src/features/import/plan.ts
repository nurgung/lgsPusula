import { createHash } from "node:crypto";
import { foldTurkish } from "@/features/curriculum/catalog";
import { commitStudyLog, type StudyLogPayload } from "@/features/study/commit-log";
import { studyLogSchema } from "@/features/study/schemas";
import { IMPORT_LIMITS, isFormulaCell } from "./grid";

const HEADERS = ["tarih", "ders", "soru", "dogru", "yanlis", "bos", "sure"] as const;

export type ImportIssue = { line: number; message: string };

export type ImportPlan = {
  ready: StudyLogPayload[];
  issues: ImportIssue[];
};

function requestIdFor(studentId: string, canonical: string): string {
  const hash = createHash("sha256").update(`${studentId}|${canonical}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function headerMap(row: readonly string[]): Map<string, number> | null {
  const map = new Map<string, number>();
  row.forEach((cell, index) => {
    const name = foldTurkish(cell).replaceAll(" ", "");
    if ((HEADERS as readonly string[]).includes(name)) map.set(name, index);
  });
  if (HEADERS.some((name) => !map.has(name))) return null;
  return map;
}

/**
 * Turns a grid into study rows for the signed-in student. The file cannot name
 * another student. The same row produces the same request id, so a second import
 * does not create a second log.
 */
export function planStudyImport(input: {
  studentId: string;
  today: string;
  subjects: readonly { id: string; name: string }[];
  grid: readonly (readonly string[])[];
}): ImportPlan {
  const issues: ImportIssue[] = [];
  const ready: StudyLogPayload[] = [];
  const seen = new Set<string>();
  if (input.grid.length === 0) {
    return { ready, issues: [{ line: 1, message: "Dosyada satır yok." }] };
  }
  const columns = headerMap(input.grid[0] ?? []);
  if (!columns) {
    return {
      ready,
      issues: [
        {
          line: 1,
          message: "İlk satır tarih, ders, soru, dogru, yanlis, bos, sure olmalı.",
        },
      ],
    };
  }
  const dataRows = input.grid.slice(1);
  if (dataRows.length > IMPORT_LIMITS.maxRows) {
    return {
      ready,
      issues: [{ line: 2, message: `En fazla ${IMPORT_LIMITS.maxRows} satır alınır.` }],
    };
  }
  dataRows.forEach((row, index) => {
    const line = index + 2;
    const cell = (name: (typeof HEADERS)[number]) => {
      const at = columns.get(name) ?? 0;
      return (row[at] ?? "").trim();
    };
    const values = HEADERS.map((name) => cell(name));
    if (values.every((value) => value === "")) return;
    if (values.some((value) => isFormulaCell(value))) {
      issues.push({ line, message: "Formül içeren satır alınmaz." });
      return;
    }
    const subjectName = cell("ders");
    const matches = input.subjects.filter(
      (subject) => foldTurkish(subject.name) === foldTurkish(subjectName),
    );
    if (matches.length !== 1) {
      issues.push({ line, message: "Ders adı listedeki bir dersle aynı değil." });
      return;
    }
    const parsed = studyLogSchema(input.today).safeParse({
      studiedOn: cell("tarih"),
      subjectId: matches[0]!.id,
      catalogItem: "",
      questionCount: cell("soru"),
      correctCount: cell("dogru"),
      wrongCount: cell("yanlis"),
      blankCount: cell("bos"),
      durationMinutes: cell("sure"),
    });
    if (!parsed.success) {
      issues.push({
        line,
        message: parsed.error.issues[0]?.message ?? "Bu satır alınamadı.",
      });
      return;
    }
    const canonical = [
      parsed.data.studiedOn,
      matches[0]!.id,
      parsed.data.questionCount,
      parsed.data.correctCount,
      parsed.data.wrongCount,
      parsed.data.blankCount,
      parsed.data.durationMinutes,
    ].join("|");
    const requestId = requestIdFor(input.studentId, canonical);
    if (seen.has(requestId)) {
      issues.push({ line, message: "Bu satır dosyada tekrar ediyor." });
      return;
    }
    seen.add(requestId);
    ready.push({
      studentId: input.studentId,
      studiedOn: parsed.data.studiedOn,
      subjectId: matches[0]!.id,
      topicId: null,
      outcomeId: null,
      questionCount: parsed.data.questionCount,
      correctCount: parsed.data.correctCount,
      wrongCount: parsed.data.wrongCount,
      blankCount: parsed.data.blankCount,
      durationMinutes: parsed.data.durationMinutes,
      requestId,
    });
  });
  return { ready, issues };
}

export const IMPORT_TEMPLATE = "tarih,ders,soru,dogru,yanlis,bos,sure\n";

type ImportStore = Parameters<typeof commitStudyLog>[1];

/**
 * Writes only rows that already belong to the signed-in student.
 * A row aimed at someone else rejects the whole batch and writes nothing.
 */
export async function commitPlannedLogs(
  actorId: string,
  rows: readonly StudyLogPayload[],
  store: ImportStore,
): Promise<{ created: number; unchanged: number } | { refused: true }> {
  if (rows.some((row) => row.studentId !== actorId)) return { refused: true };
  let created = 0;
  let unchanged = 0;
  for (const row of rows) {
    const result = await commitStudyLog(row, store);
    if (result.status === "conflict") return { refused: true };
    if (result.status === "created") created += 1;
    else unchanged += 1;
  }
  return { created, unchanged };
}
