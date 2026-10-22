import { describe, expect, it } from "vitest";
import { decryptBackup, encryptBackup, isLoopbackDatabase } from "./backup-file";

describe("backup file", () => {
  it("round-trips bytes and rejects a wrong passphrase", () => {
    const plain = Buffer.from("create table public.profiles ();");
    const encrypted = encryptBackup(plain, "uzun-bir-parola");
    expect(encrypted.subarray(0, 4).toString()).toBe("LGS1");
    expect(decryptBackup(encrypted, "uzun-bir-parola").equals(plain)).toBe(true);
    expect(() => decryptBackup(encrypted, "baska-bir-parola")).toThrow();
  });

  it("rejects a short passphrase before writing anything", () => {
    expect(() => encryptBackup(Buffer.from("x"), "kisa")).toThrow(/12/);
  });

  it("treats only loopback hosts as a safe restore trial target", () => {
    expect(
      isLoopbackDatabase("postgresql://postgres:postgres@127.0.0.1:55322/postgres"),
    ).toBe(true);
    expect(
      isLoopbackDatabase("postgresql://postgres:secret@db.example.com:5432/postgres"),
    ).toBe(false);
  });
});
