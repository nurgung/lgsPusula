import { supportiveCopyIssues } from "@/features/coaching/messages";

/**
 * Parent-facing report copy. Counts, dates, and units are filled in by the document builder.
 * The sentences avoid shame, fear, and comparison with other students.
 */
export const REPORT_MESSAGES = {
  weekTitle: "Bu hafta",
  monthTitle: "Bu ay",
  weekHint:
    "Hafta pazartesi başlar, pazar biter. Süre dakikadır ve hedefe sayılmaz. Birim soru ve dakika.",
  monthHint:
    "Ay, takvim ayıdır. Süre dakikadır ve hedefe sayılmaz. Birim soru ve dakika. Aylık hedef yoktur.",
  unfinishedWeek: "Bu hafta henüz bitmedi. Aralık pazartesiden bugüne kadardır.",
  finishedWeek: "Bu, bitmiş bir haftadır: pazartesiden pazara.",
  unfinishedMonth: "Bu ay henüz bitmedi. Aralık ayın ilk gününden bugüne kadardır.",
  comparisonNote:
    "İki aralığın uzunluğu eşit olmayabilir. İkisi de tarihleriyle yazılır.",
  noSubjects: "Bu dönemde çalışma kaydı yok. Kayıt yoksa bir ders sonucu çıkarılmaz.",
  noGoals: "Bu dönemde gösterilecek hedef yok.",
  goalCountNote:
    "Haftalık hedefin aralığı pazartesiden pazara kadardır. Yapılan soru, rapor dönemine giren günleri sayar. Birim sorudur.",
  noExams: "Bu dönemde deneme yok. Deneme yoksa net hesaplanmaz.",
  dailyGoalSkipped:
    "Günlük hedef yalnızca içinde bulunulan gün için gösterilir. Geçen haftanın raporunda haftalık hedefler yer alır.",
  parentSuggestionNote:
    "Bu öneri öğrencinin kayıtlarından hesaplanır. Kayıtları yalnızca öğrenci değiştirebilir.",
  downloadHint:
    "Rapor sunucuda hazırlanır. Dosya 24 saat sonra silinir. İçinde dönem, üretim zamanı ve ölçülerin anlamı yazar.",
  downloadCurrent: "Bu haftanın raporunu indir",
  downloadPrevious: "Geçen haftanın raporunu indir",
  preparing: "Rapor hazırlanıyor...",
  generationFailed: "Rapor hazırlanamadı. Dosya indirilmedi. Biraz sonra tekrar dene.",
  emptyDocument: "Rapor boş kaldı. Dosya indirilmedi.",
  providerError:
    "Rapor şu anda hazırlanamadı. Dosya indirilmedi. Biraz sonra tekrar dene.",
  formInvalid: "Rapor isteği anlaşılmadı. Sayfayı yenileyip tekrar dene.",
  notReady:
    "Bu rapor indirilemedi. Süresi dolmuş olabilir veya bu öğrenciye bağlı değilsin. Boş dosya gönderilmedi.",
  rateLimited: (minutes: number) =>
    `Çok sık rapor istedin. ${minutes} dakika sonra tekrar dene.`,
} as const;

export const REPORT_EXPLANATIONS = [
  "Soru, doğru, yanlış ve boş sayıları öğrencinin yazdığı kayıtların toplamıdır.",
  "Süre dakikadır. Hedefe sayılmaz.",
  "Net = doğru - (yanlış / 3). Boş soru neti değiştirmez. Ders neti eksi olabilir. Toplam net eksi çıkarsa 0 yazılır.",
  "Gün sınırı İstanbul saatiyle gece yarısıdır.",
  "Bu rapor başka bir öğrenciyle kıyaslama yapmaz ve bir sonuç vaadi değildir.",
] as const;

/** Static parent copy must stay supportive. Names and counts are checked with the document. */
export function reportCopyIssues(): readonly string[] {
  const staticText = [
    ...Object.values(REPORT_MESSAGES).filter((value) => typeof value === "string"),
    ...REPORT_EXPLANATIONS,
    REPORT_MESSAGES.rateLimited(5),
  ].join("\n");
  return supportiveCopyIssues(staticText);
}
