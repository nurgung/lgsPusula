export const FAMILY_MESSAGES = {
  formInvalid: "Formda düzeltilmesi gereken alanlar var.",
  providerError: "Bir sorun oluştu ve işlem tamamlanamadı. Biraz sonra tekrar dene.",
  rateLimited: (minutes: number) =>
    `Çok fazla deneme yapıldı. Güvenliğin için ${minutes} dakika sonra tekrar dene.`,
  codeRequired: "Davet kodunu yaz.",
  codeInvalid: "Bu kod geçersiz. Doğru yazıldığından emin ol.",
  codeExpired: "Bu kodun süresi dolmuş. Öğrenciden yeni bir kod iste.",
  alreadyLinked: "Bu öğrencinin zaten bir velisi var.",
  pendingExists: "Bu öğrencinin yanıt bekleyen bir isteği var.",
  notAllowed: "Bu işlem bu hesapla yapılamaz.",
  linkMissing: "Bu bağlantı bulunamadı veya artık yanıtlanamaz.",
  linkExpired: "Bu isteğin süresi dolmuş. Yeni bir kod gerekir.",
  approved: "Bağlantı kuruldu. Velin çalışmalarını görebilir, değiştiremez.",
  declined: "İsteği reddettin.",
  revoked: "Bağlantı kaldırıldı. Erişim bir sonraki istekte kalkar.",
  mfaCodeRequired: "6 haneli kodu yaz.",
  mfaCodeInvalid: "Kod hatalı veya süresi doldu. Uygulamadaki güncel kodu yaz.",
} as const;
