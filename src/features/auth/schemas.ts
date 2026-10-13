import { z } from "zod";
import { normalizeUsername, USERNAME_PATTERN } from "./username";

export const PASSWORD_MIN_LENGTH = 10;
/** bcrypt (used by Supabase Auth) ignores everything after 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;

const utf8Length = (value: string) => new TextEncoder().encode(value).length;

export const passwordPolicySchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Parola en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`)
  .refine((value) => utf8Length(value) <= PASSWORD_MAX_BYTES, {
    message: "Parola çok uzun. Daha kısa bir parola seç.",
  })
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "Parolada en az bir harf ve en az bir rakam olmalı.",
  });

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .min(1, "Kullanıcı adını yaz.")
      .regex(
        USERNAME_PATTERN,
        "Kullanıcı adı 3–32 karakter olmalı ve yalnızca a–z harfleri, rakamlar ve _ içermeli.",
      ),
  );

export const loginSchema = z.object({
  username: usernameSchema,
  // No policy check here: only the provider decides whether a password is correct.
  password: z.string().min(1, "Parolanı yaz.").max(200, "Parola çok uzun."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Şu anki parolanı yaz.")
      .max(200, "Parola çok uzun."),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Yeni parolanı tekrar yaz."),
  })
  .superRefine((value, ctx) => {
    if (value.confirmPassword && value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "İki yeni parola aynı değil.",
      });
    }
    if (value.newPassword && value.newPassword === value.currentPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Yeni parola eskisinden farklı olmalı.",
      });
    }
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** First message per field, keyed by the top-level field name. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in result)) result[key] = issue.message;
  }
  return result;
}
