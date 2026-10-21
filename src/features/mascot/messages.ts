import { MASCOT_RULE_VERSION } from "./constants";

/**
 * Supportive copy for an 8th grader. A missed day is not a fault.
 * The reminder never mentions an exam, a net, or a score (decision 0.8).
 */

export const MASCOT_MESSAGES = {
  ruleLabel: `Kural: ${MASCOT_RULE_VERSION}`,
  pointsUnit: "karakter puanı",
  noSpeciesTitle: "Henüz bir karakter seçmedin.",
  noSpeciesDescription: "Bir hayvan ya da bitki seçebilirsin. Seçmek puanını değiştirmez.",
  changeSpeciesHint: "Karakteri değiştirmek puanını değiştirmez.",
  noRegression: "Bir gün ara vermek puanı düşürmez ve karakteri geri götürmez.",
  savedSpecies: "Karakterin kaydedildi.",
  savedPreferences: "Hatırlatma ayarların kaydedildi.",
  providerError: "Kayıt şu anda tamamlanamadı. Biraz sonra tekrar deneyebilirsin.",
  formInvalid: "Seçimleri kontrol edip yeniden dene.",
  reminderTitle: "Hatırlatma",
  reminderBody: "Bugün henüz bir çalışma kaydı yok. İstersen şimdi kısaca ekleyebilirsin.",
  reminderAction: "Kayıt ekle",
  reminderDismiss: "Bugün gösterme",
  tasksTitle: "Bugünün görevleri",
  tasksEmptyTitle: "Bugün için açık görevin yok.",
  tasksEmptyDescription: "İstersen yine de bir çalışma kaydı ekleyebilirsin.",
  taskLog: "Bugün bir çalışma kaydı ekle.",
  taskGoal: "Bugünkü soru hedefine ulaş.",
  taskReview: "İstersen bir denemendeki soruları kazanımla eşleştirebilirsin.",
  taskOpen: "Açık",
  taskDone: "Tamam",
  badgesTitle: "Rozetler",
  badgePending: "Henüz değil",
  badgeEarned: "Kazandın",
  notificationsTitle: "Hatırlatmalar",
  notificationsHint:
    "Hatırlatma yalnızca bu uygulamada görünür. E-posta gönderilmez. Sessiz saatler Türkiye saatiyledir (İstanbul).",
  parentEmptyTitle: "Henüz bir karakter seçilmedi.",
  parentEmptyDescription: "Öğrenci bir karakter seçerse burada görürsün. Puanı değiştiremezsin.",
  parentReadOnly: "Karakteri ve puanı görebilirsin, değiştiremezsin.",
} as const;

const BANNED_FRAGMENTS = [
  "yine çalışmadın",
  "herkes",
  "senden daha",
  "kazanamaz",
  "kesin başar",
  "utanç",
  "kötü",
  "başarısız",
  "geride kald",
  "ceza",
  "üzgün",
  "tembel",
  "kork",
  "kaybeder",
  "sıralama",
  "rakip",
] as const;

/** Fragments that must not appear in mascot copy. Empty means the text is fine. */
export function supportiveCopyIssues(text: string): readonly string[] {
  const folded = text.toLocaleLowerCase("tr-TR");
  return BANNED_FRAGMENTS.filter((fragment) => folded.includes(fragment));
}

/** Exam results, nets and scores stay out of a reminder (decision 0.8). */
const SENSITIVE_REMINDER_FRAGMENTS = ["net", "puan", "yanlış", "doğru", "sınav", "deneme"] as const;

export function reminderSensitiveIssues(text: string): readonly string[] {
  const folded = text.toLocaleLowerCase("tr-TR");
  return SENSITIVE_REMINDER_FRAGMENTS.filter((fragment) => folded.includes(fragment));
}
