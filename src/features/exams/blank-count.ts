const WHOLE_NUMBER = /^\d+$/;

/** Empty counts as zero. Anything else that is not a whole number is rejected. */
export function parseCountInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!WHOLE_NUMBER.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export type DerivedBlank = { value: string; error?: string };

/**
 * Blank questions left after correct and wrong answers.
 * The same total rule the server checks: doğru + yanlış + boş = soru sayısı.
 */
export function deriveBlankCount({
  questionCount,
  correct,
  wrong,
}: {
  questionCount: number | null;
  correct: string;
  wrong: string;
}): DerivedBlank {
  if (questionCount === null || !Number.isInteger(questionCount) || questionCount < 1) {
    return { value: "" };
  }
  const correctCount = parseCountInput(correct);
  const wrongCount = parseCountInput(wrong);
  if (correctCount === null || wrongCount === null) {
    return {
      value: "",
      error: "Doğru ve yanlış için 0 veya daha büyük bir tam sayı yaz.",
    };
  }
  const blank = questionCount - correctCount - wrongCount;
  if (blank < 0) {
    return { value: "", error: "Doğru ve yanlış toplamı soru sayısını geçemez." };
  }
  return { value: String(blank) };
}
