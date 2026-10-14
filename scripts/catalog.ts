// Curriculum catalog import (decision 0.6). Run on the owner's computer only:
//   npm run catalog -- import <dosya.json>            (asks for confirmation, then writes)
//   npm run catalog -- import <dosya.json> --dry-run  (only shows what would change)
// The file format is described in docs/ARCHITECTURE.md ("Müfredat kataloğu").
import { readFile, stat } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createAdminClient, readAdminEnv } from "./lib/account-admin.ts";
import {
  applyCatalogImport,
  isLocalSupabase,
  MAX_CATALOG_FILE_BYTES,
  parseCatalogFile,
  planCatalogImport,
  readExistingCatalog,
  type ImportPlan,
} from "./lib/catalog-import.ts";

function printPlan(plan: ImportPlan) {
  const line = (label: string, counts: { create: number; update: number }) =>
    console.log(
      `  ${label.padEnd(10)} ${counts.create} yeni, ${counts.update} güncellenecek`,
    );
  line("Ders", plan.subjects);
  line("Konu", plan.topics);
  line("Kazanım", plan.outcomes);
}

async function confirm(host: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  try {
    console.log(`Hedef Supabase projesi: ${host}`);
    const answer = await rl.question("Yazmak için 'evet' yaz: ");
    return answer.trim().toLowerCase() === "evet";
  } finally {
    rl.close();
  }
}

async function importFile(path: string | undefined, dryRun: boolean) {
  if (!path || !path.toLowerCase().endsWith(".json")) {
    throw new Error("Usage: npm run catalog -- import <dosya.json> [--dry-run]");
  }
  const info = await stat(path);
  if (!info.isFile() || info.size > MAX_CATALOG_FILE_BYTES) {
    throw new Error("The file is missing or larger than 2 MB.");
  }

  const parsed = parseCatalogFile(await readFile(path, "utf8"));
  if (!parsed.ok) {
    console.log("Dosyada düzeltilmesi gereken yerler var:");
    for (const message of parsed.errors) console.log(`  - ${message}`);
    process.exitCode = 1;
    return;
  }
  const file = parsed.file;

  const env = readAdminEnv();
  const host = new URL(env.url).host;
  if (file.example && !isLocalSupabase(env.url)) {
    throw new Error(
      `This is an example file with fictional data; it is only loaded into local Supabase, not ${host}.`,
    );
  }

  const admin = createAdminClient(env);
  const plan = planCatalogImport(file, await readExistingCatalog(admin));
  console.log(`Kaynak: ${file.source.name}, sürüm ${file.source.version}`);
  if (file.example)
    console.log("Bu bir ÖRNEK dosya: içindeki konu ve kazanımlar kurgusaldır.");
  printPlan(plan);
  if (plan.conflicts.length > 0) {
    console.log("Yükleme durduruldu, hiçbir şey yazılmadı:");
    for (const message of plan.conflicts) console.log(`  - ${message}`);
    process.exitCode = 1;
    return;
  }
  if (dryRun) {
    console.log("Deneme çalıştırması: hiçbir şey yazılmadı.");
    return;
  }
  if (!(await confirm(host))) return;

  const applied = await applyCatalogImport(admin, file);
  if (applied.conflicts.length > 0) {
    // Someone changed the catalog between the plan and the write.
    for (const message of applied.conflicts) console.log(`  - ${message}`);
    process.exitCode = 1;
    return;
  }
  const { error } = await admin.from("audit_events").insert({
    event_type: "admin.catalog_import",
    outcome: "success",
    actor_id: null,
    metadata: {},
  });
  if (error) console.error(`audit_events insert failed (${error.code})`);
  console.log("Yükleme tamamlandı.");
}

async function main() {
  const [command, path, ...flags] = process.argv.slice(2);
  if (command === "import") return importFile(path, flags.includes("--dry-run"));
  throw new Error("Usage: npm run catalog -- import <dosya.json> [--dry-run]");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unexpected error.");
  process.exitCode = 1;
});
