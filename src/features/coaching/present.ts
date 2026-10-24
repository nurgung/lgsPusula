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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * First-view sentence. Outcome wording and date ranges that already sit in the
 * evidence list are left for the detail disclosure. Nothing new is added.
 */
export function coachingLead(message: string, evidence: readonly string[]): string {
  const visible = studentVisibleEvidence(evidence);
  let lead = message.trim();

  for (const line of visible) {
    const parts = line.split(" · ");
    if (parts.length < 2) continue;
    const head = parts[0]?.trim() ?? "";
    if (fold(head).startsWith("aralik")) continue;
    const description = parts
      .slice(1)
      .join(" · ")
      .trim()
      .replace(/[.!?]+$/u, "");
    if (description.length < 8 || !lead.includes(description)) continue;
    const sentence = new RegExp(
      `\\s*${escapeRegExp(head)}\\s+kazanımı şunu söyler:\\s*${escapeRegExp(description)}\\.?`,
      "u",
    );
    lead = lead.replace(sentence, "");
  }

  if (visible.some((line) => fold(line).startsWith("aralik"))) {
    lead = lead.replace(
      /\s*\(?\s*\d{1,2}\s+\p{L}+\s+\d{4}\s+–\s+\d{1,2}\s+\p{L}+\s+\d{4}(?:\s+arasında)?\s*\)?/gu,
      " ",
    );
  }

  lead = lead.replace(/\s+dersinde\s*\.\s*/u, " dersinde ");
  lead = lead.replace(/dersinde\s+Bu\b/u, "dersinde bu");
  return lead.replace(/\s{2,}/gu, " ").replace(/\s+([.,])/gu, "$1").trim();
}
