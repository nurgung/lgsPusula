// Family account administration (decisions 0.3, 0.8, 0.13). Run on the owner's computer only:
//   npm run accounts -- setup
//   npm run accounts -- reset-password <kullanici_adi>
// Temporary passwords are printed to this terminal once and are not stored anywhere.
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { isValidUsername, normalizeUsername } from "../src/features/auth/username.ts";
import {
  createAccount,
  createAdminClient,
  findAccountId,
  generateTemporaryPassword,
  readAdminEnv,
  resetPassword,
} from "./lib/account-admin.ts";

const rl = createInterface({ input, output });
// Reading lines in order (instead of rl.question) also works when answers are piped in.
const lines = rl[Symbol.asyncIterator]();

async function ask(prompt: string): Promise<string> {
  output.write(prompt);
  const next = await lines.next();
  if (next.done) throw new Error("Input ended before all questions were answered.");
  return next.value;
}

async function askUsername(label: string): Promise<string> {
  for (;;) {
    const value = normalizeUsername(await ask(`${label} kullanıcı adı: `));
    if (isValidUsername(value)) return value;
    console.log("  3–32 karakter; yalnızca a–z, rakam ve _ kullan.");
  }
}

async function askDisplayName(label: string): Promise<string> {
  for (;;) {
    const value = (await ask(`${label} görünen ad (takma ad olabilir): `)).trim();
    if (value.length >= 1 && value.length <= 50) return value;
    console.log("  1–50 karakter olmalı.");
  }
}

async function confirmTarget(url: string): Promise<boolean> {
  console.log(`Hedef Supabase projesi: ${new URL(url).host}`);
  const answer = await ask("Devam etmek için 'evet' yaz: ");
  return answer.trim().toLowerCase() === "evet";
}

function printCredentials(rows: { label: string; username: string; password: string }[]) {
  console.log(
    "\nGeçici parolalar (yalnızca şimdi gösterilir; ilk girişte değiştirilecek):",
  );
  for (const row of rows) {
    console.log(`  ${row.label.padEnd(8)} ${row.username.padEnd(20)} ${row.password}`);
  }
  console.log("Bu ekranı kapattıktan sonra parolalar bir daha görüntülenemez.\n");
}

async function setup() {
  const env = readAdminEnv();
  if (!(await confirmTarget(env.url))) return;
  const admin = createAdminClient(env);

  const parentUsername = await askUsername("Veli (yönetici)");
  const parentName = await askDisplayName("Veli");
  const studentUsername = await askUsername("Öğrenci");
  if (studentUsername === parentUsername) throw new Error("Usernames must differ.");
  const studentName = await askDisplayName("Öğrenci");

  for (const username of [parentUsername, studentUsername]) {
    if (await findAccountId(admin, username)) {
      throw new Error(`An account named "${username}" already exists.`);
    }
  }

  const parentPassword = generateTemporaryPassword();
  const studentPassword = generateTemporaryPassword();
  await createAccount(admin, {
    username: parentUsername,
    displayName: parentName,
    roles: ["parent", "admin"],
    password: parentPassword,
  });
  await createAccount(admin, {
    username: studentUsername,
    displayName: studentName,
    roles: ["student"],
    password: studentPassword,
  });

  printCredentials([
    { label: "Veli", username: parentUsername, password: parentPassword },
    { label: "Öğrenci", username: studentUsername, password: studentPassword },
  ]);
}

async function reset(rawUsername: string | undefined) {
  const username = normalizeUsername(rawUsername ?? "");
  if (!isValidUsername(username)) {
    throw new Error("Usage: npm run accounts -- reset-password <kullanici_adi>");
  }
  const env = readAdminEnv();
  if (!(await confirmTarget(env.url))) return;
  const password = generateTemporaryPassword();
  await resetPassword(env, createAdminClient(env), username, password);
  console.log("Hesabın tüm oturumları kapatıldı.");
  printCredentials([{ label: "Yeni", username, password }]);
}

async function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === "setup") return setup();
  if (command === "reset-password") return reset(argument);
  throw new Error("Usage: npm run accounts -- setup | reset-password <kullanici_adi>");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Unexpected error.");
    process.exitCode = 1;
  })
  .finally(() => rl.close());
