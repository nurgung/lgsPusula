import { describe, expect, it } from "vitest";
import {
  ERASE_PHRASE,
  assertExportHasNoSecrets,
  confirmed,
  omitSecrets,
} from "./family-export";

describe("family export", () => {
  it("requires the exact erase phrase", () => {
    expect(confirmed("verileri sil", ERASE_PHRASE)).toBe(true);
    expect(confirmed("evet", ERASE_PHRASE)).toBe(false);
    expect(confirmed(" VERİLERİ SİL ", ERASE_PHRASE)).toBe(true);
  });

  it("removes invite hashes, pdf bytes and tokens but keeps the display name", () => {
    const clean = omitSecrets({
      display_name: "Pusula",
      code_hash: "a".repeat(64),
      nested: { pdf_bytes: "JVBERi0", email: "ada@users.lgs-pusula.invalid" },
    });
    const serialized = JSON.stringify(clean);
    expect(serialized).toContain("Pusula");
    expect(serialized).not.toContain("code_hash");
    expect(serialized).not.toContain("JVBERi0");
    expect(serialized).not.toContain("ada@");
    expect(() => assertExportHasNoSecrets(serialized)).not.toThrow();
  });

  it("refuses to write a payload that still has a token", () => {
    expect(() =>
      assertExportHasNoSecrets(
        '{"access":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturevalue"}',
      ),
    ).toThrow(/secret-bearing/);
  });
});
