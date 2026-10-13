import { createHmac, randomInt } from "node:crypto";

/**
 * 31 symbols, no 0/O/1/I/L. Twelve characters is about 59 bits (decision 0.4 asks for ~50).
 * Shown in groups of four so it can be read aloud.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 12;
export const INVITE_CODE_TTL_MS = 24 * 60 * 60 * 1000;

export function generateInviteCode(
  nextInt: (max: number) => number = (max) => randomInt(max),
): string {
  let raw = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    raw += ALPHABET[nextInt(ALPHABET.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

/** Strips spaces and dashes and uppercases. Returns null when the code is not 10 alphabet characters. */
export function normalizeInviteCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== INVITE_CODE_LENGTH) return null;
  if ([...raw].some((char) => !ALPHABET.includes(char))) return null;
  return raw;
}

/** Keyed hash stored in the database. The plaintext code is never written. */
export function hashInviteCode(normalizedCode: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`family-invite\u0000${normalizedCode}`)
    .digest("hex");
}
