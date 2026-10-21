import {
  MAX_PDF_BYTES,
  MIN_PDF_BYTES,
  PDF_HEADER,
  type ReportFailureCode,
} from "./constants";

const PDF_MAGIC = Array.from(PDF_HEADER, (char) => char.charCodeAt(0));

/** True only for a non-empty PDF that stays inside the size limit. */
export function isDownloadablePdf(
  bytes: Uint8Array | null | undefined,
): bytes is Uint8Array {
  if (!bytes) return false;
  if (bytes.byteLength < MIN_PDF_BYTES || bytes.byteLength > MAX_PDF_BYTES) return false;
  return PDF_MAGIC.every((byte, index) => bytes[index] === byte);
}

/**
 * A thrown renderer or a file that is not a real PDF becomes a failed job with no bytes.
 * The caller must not send those bytes to the browser.
 */
export function classifyReportBytes(
  bytes: Uint8Array | null,
  failed: boolean,
): { ok: true; bytes: Uint8Array } | { ok: false; failureCode: ReportFailureCode } {
  if (failed) return { ok: false, failureCode: "generation_failed" };
  if (!isDownloadablePdf(bytes)) return { ok: false, failureCode: "empty_document" };
  return { ok: true, bytes };
}

/** PostgREST returns bytea as a `\x` hex string. Anything else is not a file. */
export function decodeBytea(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (typeof value !== "string" || value.length === 0) return null;
  const hex = value.startsWith("\\x") ? value.slice(2) : null;
  if (hex === null || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) return null;
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export function encodeBytea(bytes: Uint8Array): string {
  return `\\x${Buffer.from(bytes).toString("hex")}`;
}
