import { describe, expect, it } from "vitest";
import {
  classifyReportBytes,
  decodeBytea,
  encodeBytea,
  isDownloadablePdf,
} from "./bytes";
import { MIN_PDF_BYTES } from "./constants";

function realEnough(): Uint8Array {
  const bytes = new Uint8Array(MIN_PDF_BYTES);
  bytes.set(new TextEncoder().encode("%PDF-1.7"));
  return bytes;
}

describe("report bytes", () => {
  it("accepts a PDF header inside the size window and rejects an empty file", () => {
    const bytes = realEnough();
    expect(isDownloadablePdf(bytes)).toBe(true);
    expect(isDownloadablePdf(new Uint8Array())).toBe(false);
    expect(isDownloadablePdf(new TextEncoder().encode("%PDF-"))).toBe(false);
    expect(isDownloadablePdf(new Uint8Array(MIN_PDF_BYTES))).toBe(false);
  });

  it("does not keep bytes when rendering fails or the file is not a PDF", () => {
    expect(classifyReportBytes(realEnough(), true)).toEqual({
      ok: false,
      failureCode: "generation_failed",
    });
    expect(classifyReportBytes(new Uint8Array(), false)).toEqual({
      ok: false,
      failureCode: "empty_document",
    });
    expect(classifyReportBytes(null, false)).toEqual({
      ok: false,
      failureCode: "empty_document",
    });
    const kept = classifyReportBytes(realEnough(), false);
    expect(kept.ok).toBe(true);
  });

  it("round-trips bytea hex without treating other strings as a file", () => {
    const bytes = realEnough();
    expect(decodeBytea(encodeBytea(bytes))).toEqual(bytes);
    expect(decodeBytea("not-hex")).toBeNull();
    expect(decodeBytea("\\xZZ")).toBeNull();
  });
});
