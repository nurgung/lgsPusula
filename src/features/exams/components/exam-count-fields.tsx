"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/form-field";
import { deriveBlankCount, parseCountInput } from "@/features/exams/blank-count";

const BLANK_HINT = "Soru sayısından doğru ve yanlış düşünce kalır.";

/**
 * Correct and wrong are typed. Blank is the remainder of the question count and is
 * submitted with the form, but the student does not type it.
 */
export function ExamCountFields({
  idPrefix,
  namePrefix,
  fixedQuestionCount,
  initialQuestionCount = "",
  initialCorrect,
  initialWrong,
  fieldErrors,
}: {
  idPrefix: string;
  namePrefix: string;
  /** LGS slots have a fixed size. Branş denemesinde öğrenci soru sayısını yazar. */
  fixedQuestionCount?: number;
  initialQuestionCount?: string;
  initialCorrect: string;
  initialWrong: string;
  fieldErrors: Record<string, string>;
}) {
  const [question, setQuestion] = useState(initialQuestionCount);
  const [correct, setCorrect] = useState(initialCorrect);
  const [wrong, setWrong] = useState(initialWrong);
  const questionCount =
    fixedQuestionCount ??
    (question.trim() === "" ? null : parseCountInput(question));
  const derived = deriveBlankCount({ questionCount, correct, wrong });
  const blankError = derived.error ?? fieldErrors[`${namePrefix}.blankCount`];

  const counts = (
    <>
      <NumberField
        id={`${idPrefix}-correct`}
        name={`${namePrefix}.correctCount`}
        label="Doğru"
        value={correct}
        onChange={(event) => setCorrect(event.target.value)}
        required
        error={fieldErrors[`${namePrefix}.correctCount`]}
      />
      <NumberField
        id={`${idPrefix}-wrong`}
        name={`${namePrefix}.wrongCount`}
        label="Yanlış"
        value={wrong}
        onChange={(event) => setWrong(event.target.value)}
        required
        error={fieldErrors[`${namePrefix}.wrongCount`]}
      />
      <NumberField
        id={`${idPrefix}-blank`}
        name={`${namePrefix}.blankCount`}
        label="Boş"
        value={derived.value}
        readOnly
        required
        hint={BLANK_HINT}
        error={blankError}
      />
    </>
  );

  if (fixedQuestionCount !== undefined) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="hidden"
          name={`${namePrefix}.questionCount`}
          value={String(fixedQuestionCount)}
        />
        {counts}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <NumberField
        id={`${idPrefix}-questions`}
        name={`${namePrefix}.questionCount`}
        label="Soru sayısı"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        required
        error={fieldErrors[`${namePrefix}.questionCount`]}
      />
      {counts}
    </div>
  );
}
