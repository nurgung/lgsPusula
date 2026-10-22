// Family data tools (decisions 0.3, 0.5, 0.13). Run on the owner's computer only:
//   npm run data -- export
//   npm run data -- retain
//   npm run data -- erase
// The export is personal data. It is written under backups/ and must not be committed.
import { mkdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CONFIRM_PHRASE,
  ERASE_PHRASE,
  EXPORT_NOTE,
  assertExportHasNoSecrets,
  confirmed,
  omitSecrets,
} from "../src/features/ops/family-export.ts";
import { createAdminClient, readAdminEnv } from "./lib/account-admin.ts";

const rl = createInterface({ input, output });
const lines = rl[Symbol.asyncIterator]();

async function ask(prompt: string): Promise<string> {
  output.write(prompt);
  const next = await lines.next();
  if (next.done) throw new Error("Input ended before all questions were answered.");
  return next.value;
}

async function confirmHost(url: string, phrase: string): Promise<boolean> {
  console.log(`Hedef Supabase projesi: ${new URL(url).host}`);
  const answer = await ask(`Devam etmek için '${phrase}' yaz: `);
  return confirmed(answer, phrase);
}

function exportPath(): string {
  const stamp = new Date().toISOString().replaceAll(/[-:]/g, "").slice(0, 15);
  const abs = resolve("backups", `aile-${stamp}.json`);
  const root = resolve("backups");
  const rel = relative(root, abs);
  if (rel.startsWith("..")) throw new Error("Export path escaped the backups directory.");
  return abs;
}

async function readAll(
  admin: SupabaseClient,
  table: string,
  columns: string,
): Promise<unknown[]> {
  const pageSize = 1000;
  const rows: unknown[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} read failed (${error.code ?? "unknown"})`);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
    if (rows.length > 50_000) throw new Error(`${table} export exceeded 50000 rows.`);
  }
}

async function exportFamily(admin: SupabaseClient): Promise<void> {
  const document = omitSecrets({
    exportedAt: new Date().toISOString(),
    note: EXPORT_NOTE,
    profiles: await readAll(
      admin,
      "profiles",
      "id, username, display_name, roles, must_change_password, created_at",
    ),
    familyLinks: await readAll(
      admin,
      "family_links",
      "id, student_id, parent_id, status, created_at, expires_at, responded_at, revoked_at",
    ),
    familyInvites: await readAll(
      admin,
      "family_invites",
      "id, student_id, created_at, expires_at, consumed_at, superseded_at",
    ),
    studyLogs: await readAll(
      admin,
      "study_logs",
      "id, student_id, studied_on, subject_id, topic_id, learning_outcome_id, question_count, correct_count, wrong_count, blank_count, duration_minutes, created_at, updated_at",
    ),
    studyGoals: await readAll(
      admin,
      "study_goals",
      "id, student_id, period, subject_id, target_questions, created_at, updated_at",
    ),
    exams: await readAll(
      admin,
      "exams",
      "id, student_id, title, taken_on, exam_type, rule_version, total_net, created_at, updated_at",
    ),
    examSubjectResults: await readAll(
      admin,
      "exam_subject_results",
      "id, exam_id, subject_id, question_count, correct_count, wrong_count, blank_count, net, created_at, updated_at",
    ),
    examMistakes: await readAll(
      admin,
      "exam_mistakes",
      "id, exam_subject_result_id, learning_outcome_id, mistake_kind, source, confidence, sort_order, created_at, updated_at",
    ),
    mascotProfiles: await readAll(
      admin,
      "mascot_profiles",
      "student_id, species, created_at, updated_at",
    ),
    rewardEvents: await readAll(
      admin,
      "reward_events",
      "id, student_id, event_type, points, idempotency_key, source_date, rule_version, created_at",
    ),
    notificationPreferences: await readAll(
      admin,
      "notification_preferences",
      "student_id, enabled, quiet_start, quiet_end, max_per_day, updated_at",
    ),
    notices: await readAll(
      admin,
      "in_app_notices",
      "id, student_id, kind, notice_date, sequence, dismissed_at, created_at",
    ),
    reportJobs: await readAll(
      admin,
      "report_jobs",
      "id, student_id, requested_by, report_type, period_from, period_to, status, byte_size, failure_code, storage_kind, created_at, expires_at",
    ),
    auditEvents: await readAll(
      admin,
      "audit_events",
      "id, occurred_at, event_type, actor_id, outcome, metadata",
    ),
  });
  const serialized = JSON.stringify(document, null, 2);
  assertExportHasNoSecrets(serialized);
  const path = exportPath();
  mkdirSync(resolve("backups"), { recursive: true });
  writeFileSync(path, serialized, { mode: 0o600 });
  console.log(`Dışa aktarma yazıldı: ${path}`);
  console.log("Bu dosya kişisel veri içerir. Depoya ekleme.");
}

async function main() {
  const command = process.argv[2];
  const env = readAdminEnv();
  if (command === "export") {
    if (!(await confirmHost(env.url, CONFIRM_PHRASE))) return;
    await exportFamily(createAdminClient(env));
    return;
  }
  if (command === "retain") {
    if (!(await confirmHost(env.url, CONFIRM_PHRASE))) return;
    const { data, error } = await createAdminClient(env).rpc("purge_retained_rows");
    if (error) throw new Error(`retain failed (${error.code ?? "unknown"})`);
    console.log("Saklama süresi temizliği bitti.");
    console.log(JSON.stringify(data));
    return;
  }
  if (command === "erase") {
    console.log(
      "Hesaplar, kayıtlar ve denetim günlüğü silinir. Müfredat kataloğu kalır.",
    );
    console.log("Bu işlem geri alınamaz.");
    if (!(await confirmHost(env.url, ERASE_PHRASE))) return;
    const { data, error } = await createAdminClient(env).rpc("erase_personal_data");
    if (error) throw new Error(`erase failed (${error.code ?? "unknown"})`);
    console.log("Kişisel veriler silindi.");
    console.log(JSON.stringify(data));
    return;
  }
  throw new Error("Use export, retain, or erase.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "data command failed");
    process.exitCode = 1;
  })
  .finally(() => rl.close());
