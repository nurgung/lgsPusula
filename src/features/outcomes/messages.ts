export const OUTCOME_MESSAGES = {
  formInvalid: "Bazı alanları kontrol et.",
  providerError: "Kayıt şu an tamamlanamadı. Biraz sonra tekrar dene.",
  notFound: "Bu deneme bulunamadı.",
  saved: "Kazanım eşleştirmeleri kaydedildi.",
  overLimit: "Bu derste yanlış veya boş sayısından fazla eşleştirme olamaz.",
  outcomeRequired: "Her satır için listeden bir kazanım seç.",
  wrongSubject: "Kazanım, denemenin dersiyle aynı olmalı.",
  archivedOutcome: "Eski sürümlü kazanım yeni eşleştirmeye eklenemez.",
  noMistakesToMap: "Bu denemede yanlış veya boş soru yok; eşleştirilecek bir şey yok.",
  emptyNoMappings:
    "Henüz yanlış veya boş soruyu bir kazanıma bağlamadın. Bağlayınca burada öncelik listesi görünür.",
  emptyTrend:
    "Bu aralıkta net değişimini görmek için en az iki deneme gerekir. İlk denemeni yazman yeterli bir başlangıç.",
  emptyTrendOne:
    "Bu aralıkta bir deneme var. Bir deneme daha kaydedince değişim burada görünür.",
  chartTitle: "Denemeler arası toplam net",
  chartUnit: "Toplam net (soru neti)",
} as const;
