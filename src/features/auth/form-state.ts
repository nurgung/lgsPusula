export type AuthFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      /** Non-secret values echoed back so the user does not retype them. */
      values?: { username?: string };
    };

export const INITIAL_AUTH_FORM_STATE: AuthFormState = { status: "idle" };

export const AUTH_MESSAGES = {
  notConfigured: "Giriş şu an kullanılamıyor. Lütfen daha sonra tekrar dene.",
  formInvalid: "Formda düzeltilmesi gereken alanlar var.",
  invalidCredentials: "Kullanıcı adı veya parola hatalı.",
  rateLimited: (minutes: number) =>
    `Çok fazla deneme yapıldı. Güvenliğin için ${minutes} dakika sonra tekrar dene.`,
  providerError: "Bir sorun oluştu ve işlem tamamlanamadı. Biraz sonra tekrar dene.",
  invalidCurrentPassword: "Şu anki parolan hatalı.",
  weakPassword:
    "Bu parola yeterince güçlü değil. Daha uzun ve tahmini zor bir parola seç.",
  samePassword: "Yeni parola eskisinden farklı olmalı.",
  signOutFailed: "Çıkış yapılamadı. Biraz sonra tekrar dene.",
  notAllowed: "Bu işlem bu hesapla yapılamaz.",
  mfaCodeRequired: "6 haneli kodu yaz.",
  mfaCodeInvalid: "Kod hatalı veya süresi doldu. Uygulamadaki güncel kodu yaz.",
  mfaAlreadyEnrolled:
    "Doğrulama zaten kurulu. Uygulamadaki 6 haneli kodu girmen yeterli.",
} as const;
