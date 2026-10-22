export const ERASE_PHRASE = "verileri sil";
export const CONFIRM_PHRASE = "evet";

export function confirmed(answer: string, phrase: string): boolean {
  return answer.trim().toLocaleLowerCase("tr") === phrase;
}

const SECRET_KEYS = new Set([
  "code_hash",
  "pdf_bytes",
  "bucket_key",
  "password",
  "access_token",
  "refresh_token",
  "service_role_key",
  "email",
  "confirmation_token",
  "recovery_token",
]);

/** Drops secret-bearing keys anywhere in an export tree. Display names stay. */
export function omitSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => omitSecrets(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEYS.has(key)) continue;
    out[key] = omitSecrets(child);
  }
  return out;
}

const LEAK = /code_hash|pdf_bytes|service_role|eyJ[A-Za-z0-9_-]{8,}\./;

export function assertExportHasNoSecrets(serialized: string): void {
  if (LEAK.test(serialized)) {
    throw new Error("Export still contains a secret-bearing field.");
  }
}

export const EXPORT_NOTE =
  "Bu dosya aile kayıtlarını içerir. Depoya eklenmez. Müfredat kataloğu, davet kodu özeti, geçici PDF ve oran sınırı anahtarları yoktur.";
