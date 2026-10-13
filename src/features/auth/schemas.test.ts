import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  fieldErrorsFrom,
  loginSchema,
  passwordPolicySchema,
} from "./schemas";
import { normalizeUsername, usernameToAuthEmail } from "./username";

describe("username", () => {
  it("normalizes case and surrounding spaces", () => {
    expect(normalizeUsername("  Ogrenci_1 ")).toBe("ogrenci_1");
  });

  it("maps to an undeliverable address on the reserved .invalid TLD", () => {
    expect(usernameToAuthEmail("ogrenci_1")).toBe("ogrenci_1@users.lgs-pusula.invalid");
  });

  it.each(["ab", "öğrenci", "ali veli", "a".repeat(33), "ali@x", "İrem"])(
    "rejects %j",
    (raw) => {
      expect(loginSchema.safeParse({ username: raw, password: "x" }).success).toBe(false);
    },
  );

  it("refuses to build an e-mail from an invalid username", () => {
    expect(() => usernameToAuthEmail("x@evil.com")).toThrow();
  });
});

describe("loginSchema", () => {
  it("returns the normalized username", () => {
    const parsed = loginSchema.parse({ username: " Veli ", password: "herhangi" });
    expect(parsed.username).toBe("veli");
  });

  it("requires both fields with Turkish messages", () => {
    const result = loginSchema.safeParse({ username: "", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error)).toEqual({
        username: "Kullanıcı adını yaz.",
        password: "Parolanı yaz.",
      });
    }
  });
});

describe("passwordPolicySchema", () => {
  it.each([
    ["kisa1", false],
    ["sadeceharfler", false],
    ["1234567890", false],
    ["harf-ve-rakam-1", true],
    ["çok-güzel-parola-9", true],
  ])("%j → %s", (password, valid) => {
    expect(passwordPolicySchema.safeParse(password).success).toBe(valid);
  });

  it("rejects passwords longer than 72 bytes (bcrypt limit)", () => {
    expect(passwordPolicySchema.safeParse(`${"ş".repeat(36)}1`).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("requires matching confirmation", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "eski-parola-1",
      newPassword: "yeni-parola-2",
      confirmPassword: "yeni-parola-3",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error).confirmPassword).toBe(
        "İki yeni parola aynı değil.",
      );
    }
  });

  it("rejects reusing the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "ayni-parola-1",
      newPassword: "ayni-parola-1",
      confirmPassword: "ayni-parola-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error).newPassword).toBe(
        "Yeni parola eskisinden farklı olmalı.",
      );
    }
  });
});
