/**
 * Student-facing coaching copy. The rule engine keeps version ids and scoring
 * notes on the recommendation; this layer only decides what is shown.
 */

const HIDDEN_EVIDENCE = [
  "europe/istanbul",
  "öncelik puanı",
  "kural:",
  "haftalık hedef bu kartta kullanılmaz",
  "akademik sonuç değildir",
  "oran yok",
  "kazanım adı üretilmez",
  "karşılaştırma için en az",
  "doğru oranı gösterilmez",
  "yarısından az olan ders seçilir",
  "yarısından az değil",
] as const;

/** Drops the trailing rule id. The explanatory sentence stays. */
export function studentVisibleReason(reason: string): string {
  return reason.replace(/\s*Kural:\s*.+$/u, "").trim();
}

function fold(value: string): string {
  return value.replace(/İ/g, "i").replace(/I/g, "i").replace(/ı/g, "i").toLowerCase();
}

/** Drops internal scoring, rule ids, and time-zone notes. Facts stay. */
export function studentVisibleEvidence(lines: readonly string[]): string[] {
  return lines.filter((line) => {
    const folded = fold(line);
    return !HIDDEN_EVIDENCE.some((fragment) => folded.includes(fold(fragment)));
  });
}
