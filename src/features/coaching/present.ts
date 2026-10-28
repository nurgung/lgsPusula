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

/**
 * First-view sentence. Outcome code and description stay in the lead so the
 * student sees which wrong/blank kazanım to practice. Date ranges that already
 * sit in the evidence list are left for the detail disclosure. Nothing new is
 * added.
 */
export function coachingLead(message: string, evidence: readonly string[]): string {
  const visible = studentVisibleEvidence(evidence);
  let lead = message.trim();

  if (visible.some((line) => fold(line).startsWith("aralik"))) {
    lead = lead.replace(
      /\s*\(?\s*\d{1,2}\s+\p{L}+\s+\d{4}\s+–\s+\d{1,2}\s+\p{L}+\s+\d{4}(?:\s+arasında)?\s*\)?/gu,
      " ",
    );
  }

  return lead.replace(/\s{2,}/gu, " ").replace(/\s+([.,])/gu, "$1").trim();
}
