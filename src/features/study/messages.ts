export const STUDY_MESSAGES = {
  formInvalid: "Formda düzeltilmesi gereken alanlar var.",
  providerError: "Şu anda kaydedilemedi. Biraz sonra tekrar dene.",
  notFound: "Kayıt bulunamadı. Sayfayı yenileyip tekrar dene.",
  conflict:
    "Bu gönderim daha önce farklı bilgilerle kaydedildi. Yeni bir kayıt için sayfayı yenile.",
  saved: "Çalışma kaydın eklendi.",
  updated: "Çalışma kaydın güncellendi.",
  deleted: "Çalışma kaydı silindi.",
  goalSaved: "Hedefin kaydedildi.",
  goalDeleted: "Hedef kaldırıldı.",
} as const;

export const PLACEMENT_MESSAGES = {
  subject_missing: "Dersi listeden seç.",
  subject_archived: "Bu ders artık yeni kayıt için seçilemez.",
  topic_missing: "Konu bulunamadı. Listeden tekrar seç.",
  topic_archived: "Bu konu artık yeni kayıt için seçilemez.",
  topic_subject_mismatch: "Seçtiğin konu bu derse ait değil.",
  outcome_missing: "Kazanım bulunamadı. Listeden tekrar seç.",
  outcome_archived: "Bu kazanım artık yeni kayıt için seçilemez.",
  outcome_subject_mismatch: "Seçtiğin kazanım bu derse ait değil.",
} as const;

export type PlacementError = keyof typeof PLACEMENT_MESSAGES;
