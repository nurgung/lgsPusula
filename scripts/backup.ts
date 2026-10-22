// Encrypted backups (decision 0.1, phase 12.7). Run on the owner's computer only:
//   npm run backup -- dump
//   npm run backup -- restore backups/<file>.enc
//   npm run backup -- trial
// Plaintext dumps are deleted. The passphrase is never written to disk.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  decryptBackup,
  encryptBackup,
  isLoopbackDatabase,
} from "../src/features/ops/backup-file.ts";
import { confirmed } from "../src/features/ops/family-export.ts";

const LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
const CONTAINER = "supabase_db_lgs-pusula";

const rl = createInterface({ input, output });
const lines = rl[Symbol.asyncIterator]();

async function ask(prompt: string): Promise<string> {
  output.write(prompt);
  const next = await lines.next();
  if (next.done) throw new Error("Input ended before all questions were answered.");
  return next.value;
}

function databaseUrl(): string {
  const configured = process.env.DATABASE_URL?.trim();
  if (configured) return configured;
  return LOCAL_URL;
}

function safeMessage(error: unknown, url: string): string {
  const message = error instanceof Error ? error.message : "backup failed";
  let password = "";
  try {
    password = new URL(url).password;
  } catch {
    password = "";
  }
  return password ? message.replaceAll(password, "[secret]") : message;
}

function run(command: string, args: string[], stdin?: Buffer): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        const detail = Buffer.concat(err).toString("utf8").trim();
        reject(new Error(detail || `${command} exited ${code ?? "unknown"}`));
        return;
      }
      resolvePromise(Buffer.concat(out));
    });
    child.stdin.end(stdin ?? Buffer.alloc(0));
  });
}

async function dumpPublic(url: string): Promise<Buffer> {
  if (isLoopbackDatabase(url)) {
    return run("docker", [
      "exec",
      CONTAINER,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--schema=public",
      "--no-owner",
      "--no-acl",
    ]);
  }
  return run("pg_dump", ["--schema=public", "--no-owner", "--no-acl", "--dbname", url]);
}

async function psql(url: string, sql: string): Promise<void> {
  if (!isLoopbackDatabase(url)) {
    await run("psql", ["--dbname", url, "-v", "ON_ERROR_STOP=1"], Buffer.from(sql));
    return;
  }
  await run(
    "docker",
    [
      "exec",
      "-i",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    Buffer.from(sql),
  );
}

function backupFilePath(): string {
  const stamp = new Date().toISOString().replaceAll(/[-:]/g, "").slice(0, 15);
  const abs = resolve("backups", `lgs-pusula-${stamp}.sql.enc`);
  if (relative(resolve("backups"), abs).startsWith("..")) {
    throw new Error("Backup path escaped the backups directory.");
  }
  return abs;
}

async function dumpCommand(url: string): Promise<void> {
  console.log(`Hedef: ${new URL(url).host}`);
  const passphrase = await ask("Yedek parolası (en az 12 karakter): ");
  const plain = await dumpPublic(url);
  const encrypted = encryptBackup(plain, passphrase.trim());
  const path = backupFilePath();
  mkdirSync(resolve("backups"), { recursive: true });
  writeFileSync(path, encrypted, { mode: 0o600 });
  console.log(`Şifreli yedek yazıldı: ${path}`);
  console.log("Düz metin yedek saklanmadı. Dosyayı depoya ekleme. Saklama: 30 gün.");
}

async function restoreCommand(url: string, filePath: string): Promise<void> {
  const host = new URL(url).host;
  console.log(`Geri yüklenecek sunucu: ${host}`);
  if (!isLoopbackDatabase(url)) {
    const typed = (await ask("Uzak sunucunun adresini yaz: ")).trim();
    if (
      typed !== host ||
      !confirmed(await ask("Devam için 'uzak sunucuya yaz' yaz: "), "uzak sunucuya yaz")
    ) {
      console.log("Geri yükleme iptal edildi.");
      return;
    }
  } else if (!confirmed(await ask("Devam için 'evet' yaz: "), "evet")) {
    console.log("Geri yükleme iptal edildi.");
    return;
  }
  const passphrase = await ask("Yedek parolası: ");
  const plain = decryptBackup(readFileSync(filePath), passphrase.trim());
  await psql(url, plain.toString("utf8"));
  console.log("Geri yükleme bitti.");
}

async function trial(url: string): Promise<void> {
  if (!isLoopbackDatabase(url)) {
    throw new Error("The restore trial only runs against the local database.");
  }
  const dir = mkdtempSync(join(tmpdir(), "lgs-backup-"));
  const dumpPath = join(dir, "trial.sql");
  try {
    await psql(
      url,
      "drop table if exists public.backup_restore_trial; create table public.backup_restore_trial (id integer primary key, note text not null); insert into public.backup_restore_trial (id, note) values (1, 'deneme');",
    );
    const plain = await run("docker", [
      "exec",
      CONTAINER,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--table=public.backup_restore_trial",
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl",
    ]);
    const passphrase = "deneme-parolasi-12";
    const encrypted = encryptBackup(plain, passphrase);
    const decrypted = decryptBackup(encrypted, passphrase);
    if (!decrypted.equals(plain)) throw new Error("Decrypt did not match the dump.");
    writeFileSync(dumpPath, decrypted);
    await psql(url, "delete from public.backup_restore_trial;");
    await psql(url, decrypted.toString("utf8"));
    const check = await run("docker", [
      "exec",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-tAc",
      "select note from public.backup_restore_trial where id = 1",
    ]);
    if (check.toString("utf8").trim() !== "deneme") {
      throw new Error("Restored row did not match.");
    }
    console.log("Yerel yedek alınıp şifrelendi, çözüldü ve geri yüklendi.");
  } finally {
    await psql(url, "drop table if exists public.backup_restore_trial;").catch(
      () => undefined,
    );
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const command = process.argv[2];
  const url = databaseUrl();
  if (command === "dump") {
    await dumpCommand(url);
    return;
  }
  if (command === "restore") {
    const filePath = process.argv[3];
    if (!filePath) throw new Error("Give the encrypted backup path.");
    await restoreCommand(url, filePath);
    return;
  }
  if (command === "trial") {
    await trial(url);
    return;
  }
  throw new Error("Use dump, restore <file>, or trial.");
}

main()
  .catch((error: unknown) => {
    console.error(safeMessage(error, databaseUrl()));
    process.exitCode = 1;
  })
  .finally(() => rl.close());
