import { formatNet } from "@/features/exams/net-rules";
import {
  formatTurkishDate,
  formatTurkishDateRange,
  type DateWindow,
} from "@/features/study/calendar";

/**
 * Faz 9.4 copy review against UI_UX_GUIDELINES.md:
 * supportive, specific, and optional ("istersen"). No shame, fear, peer comparison,
 * or a promise of success. Counts, dates, and units sit in the evidence lines.
 * A subject rate is not written when the sample is under 10 questions.
 * The word "net" is reserved for the exam-net sentence so it is not read as a score.
 */

export const COACHING_MESSAGES = {
  cardTitle: "Bugünkü koçun",
  whyHeading: "Neden bu öneri?",
  narrationAbsent: "Sade anlatım yok. Öneri, çalışma kayıtlarına göre hazır.",
  narrationDisclaimer: "Bu cümle bir öneridir. Kayıtlarını ve puanını değiştirmez.",
  actionOutcome: "Kazanımlara bak",
  actionPractice: "Çalışma kaydı yaz",
  actionExam: "Gelişimi gör",
  actionGoal: "Kayıt yaz",
  actionSuggestGoal: "Hedef belirle",
  completeLabel: "Tamamlandı",
  completePending: "Kaydediliyor...",
  completeStale: "Bu kazanım artık sırada değil. Sayfayı yenile.",
  completeFailed: "Kayıt tamamlanamadı. Sayfayı yenileyip tekrar dene.",
} as const;

const BANNED_FRAGMENTS = [
  "yine çalışmadın",
  "herkes",
  "senden daha",
  "kazanamaz",
  "kesin başar",
  "utanç",
  "rezil",
  "kötü",
  "başarısız",
  "geride",
  "ceza",
  "aptal",
  "tembel",
  "kork",
  "kaybeder",
  "yetişemez",
  "sıralama",
  "rakip",
  "zayıf",
] as const;

/** Fragments that must not appear in coaching copy. Empty means the text is fine. */
export function supportiveCopyIssues(text: string): readonly string[] {
  const folded = text.toLocaleLowerCase("tr-TR");
  return BANNED_FRAGMENTS.filter((fragment) => folded.includes(fragment));
}

export function repeatOutcomeMessage(input: {
  subjectName: string;
  code: string;
  description: string;
  questionCount: number;
}): string {
  const meaning = input.description.trim().replace(/[.!?]+$/u, "");
  const questions = `${input.questionCount} soru`;
  return `${input.subjectName} dersinde ${input.code} kazanımı şunu söyler: ${meaning}. Bu kazanım için ${questions} çöz. Bitirince Tamamlandı düğmesine bas; sıradaki yanlış veya boş kazanıma geçilir.`;
}

export function repeatOutcomeReason(): string {
  return "Bu öneri, son 90 günde bir kazanıma bağladığın yanlış ve boş sorulara dayanıyor. Bağlanmamış sorulardan kazanım seçilmez.";
}

export function practiceSubjectMessage(input: {
  subjectName: string;
  window: DateWindow;
  questionCount: number;
  correctCount: number;
}): string {
  const range = formatTurkishDateRange(input.window);
  return `${input.subjectName} dersinde ${range} arasında ${input.questionCount} sorudan ${input.correctCount} tanesi doğruydu. Bu dersi biraz daha çalışmak faydalı olabilir.`;
}

export function practiceSubjectReason(): string {
  return "Bu öneri, son 14 gündeki çalışma kayıtlarındaki doğru sayısına dayanıyor. Bir derste 10 sorudan az kayıt varsa oran söylenmez.";
}

export function examNetDownMessage(input: {
  earlierNet: number;
  laterNet: number;
  earlierOn: string;
  laterOn: string;
}): string {
  const range = formatTurkishDateRange({ from: input.earlierOn, to: input.laterOn });
  return `Son iki tam LGS denemende toplam net ${formatNet(input.earlierNet)} iken ${formatNet(input.laterNet)} oldu (${range}). İstersen gelişim sayfasına bakabilirsin.`;
}

export function examNetDownReason(): string {
  return "Bu öneri, aynı türden son iki tam LGS denemesinin toplam netine dayanıyor. Branş denemeleri bu karşılaştırmaya girmez. Hangi dersin değiştiği burada söylenmez.";
}

export function goalRemainingMessage(input: {
  target: number;
  done: number;
  remaining: number;
  scope: string;
}): string {
  return `Bugünkü hedefin ${input.target} soru (${input.scope}). Şu ana kadar ${input.done} soru yazdın. İstersen kalan ${input.remaining} soruyu bugün çözebilirsin.`;
}

export function goalRemainingReason(today: string): string {
  return `Bu öneri, ${formatTurkishDate(today)} günü için kayıtlı hedefe ve bugünün çalışma kayıtlarına dayanıyor. Birim soru. Haftalık hedef bu kartta kullanılmaz.`;
}

export function suggestGoalMessage(): string {
  return "Bugün için küçük bir soru hedefi belirleyebilirsin. Hedef seçmezsen de çalışma kaydı yazabilirsin.";
}

export function suggestGoalReason(today: string): string {
  return `Bu bir ders sonucu değil. ${formatTurkishDate(today)} için günlük hedef satırı yok.`;
}

export function holdMessage(): string {
  return "Şu an belirli bir tekrar önerecek kadar açık bir işaret yok. Yeni bir çalışma, deneme veya kazanım bağlantısı ekleyince bu kart güncellenir.";
}

export function holdReason(): string {
  return "Eksik kayıttan ders, kazanım veya deneme sonucu çıkarılmaz. Küçük örneklemde oran söylenmez.";
}
