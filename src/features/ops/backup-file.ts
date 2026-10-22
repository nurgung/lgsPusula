import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const MAGIC = Buffer.from("LGS1");
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const MIN_PASSPHRASE = 12;

export function assertPassphrase(passphrase: string): void {
  if (passphrase.trim().length < MIN_PASSPHRASE) {
    throw new Error("Passphrase must be at least 12 characters.");
  }
}

/** AES-256-GCM. The passphrase is not stored. Output is not valid until decrypt succeeds. */
export function encryptBackup(plain: Buffer, passphrase: string): Buffer {
  assertPassphrase(passphrase);
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = scryptSync(passphrase, salt, KEY_BYTES, { N: 16384, r: 8, p: 1 });
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, salt, iv, tag, ciphertext]);
}

export function decryptBackup(payload: Buffer, passphrase: string): Buffer {
  assertPassphrase(passphrase);
  if (
    payload.length < MAGIC.length + SALT_BYTES + IV_BYTES + 16 ||
    !payload.subarray(0, 4).equals(MAGIC)
  ) {
    throw new Error("Backup file is not in the expected format.");
  }
  const salt = payload.subarray(4, 4 + SALT_BYTES);
  const iv = payload.subarray(20, 20 + IV_BYTES);
  const tag = payload.subarray(32, 48);
  const ciphertext = payload.subarray(48);
  const key = scryptSync(passphrase, salt, KEY_BYTES, { N: 16384, r: 8, p: 1 });
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function databaseHost(databaseUrl: string): string {
  return new URL(databaseUrl).host;
}

export function isLoopbackDatabase(databaseUrl: string): boolean {
  const host = new URL(databaseUrl).hostname;
  return host === "127.0.0.1" || host === "localhost";
}
