"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, SelectField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import type { CatalogSubject } from "@/features/curriculum/catalog";
import { replaceExamMistakesAction } from "../actions";
import { initialOutcomeFormState, type OutcomeFormState } from "../form-state";
import { OUTCOME_MESSAGES } from "../messages";
import {
  buildMistakeSlots,
  outcomeOptionGroups,
  type MistakeSlot,
  type MistakeSlotKind,
} from "../mistake-slots";

type SubjectSlot = {
  resultId: string;
  subjectId: string;
  subjectName: string;
  wrongCount: number;
  blankCount: number;
};

export function MistakeForm({
  examId,
  subjects,
  catalog,
  initialRows,
}: {
  examId: string;
  subjects: readonly SubjectSlot[];
  catalog: readonly CatalogSubject[];
  initialRows: readonly {
    resultId: string;
    kind: MistakeSlotKind;
    outcomeId: string;
  }[];
}) {
  const prefix = useId();
  const [state, formAction, pending] = useActionState(
    replaceExamMistakesAction as (
      state: OutcomeFormState,
      formData: FormData,
    ) => Promise<OutcomeFormState>,
    initialOutcomeFormState,
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const errorEntries = Object.entries(fieldErrors).map(([fieldId, message]) => ({
    fieldId,
    message,
  }));

  const [rows, setRows] = useState<MistakeSlot[]>(() =>
    buildMistakeSlots(subjects, initialRows),
  );

  const mappable = subjects.filter(
    (subject) => subject.wrongCount > 0 || subject.blankCount > 0,
  );

  if (mappable.length === 0) {
    return (
      <StateMessage
        variant="empty"
        title={OUTCOME_MESSAGES.noMistakesToMap}
        description="Doğru cevaplardan kazanım eşleştirmesi yapılmaz."
      />
    );
  }

  const setCatalogItem = (key: string, catalogItem: string) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, catalogItem } : row)),
    );
  };

  return (
    <form action={formAction} className="grid min-w-0 gap-5" noValidate>
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="rowCount" value={rows.length} />

      {errorEntries.length > 0 ? <FormErrorSummary errors={errorEntries} /> : null}
      {state.status === "error" && errorEntries.length === 0 && state.message ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}

      <p className="text-sm text-ink-700">
        Her yanlış ve her boş soru için bir liste açılır. İstediğin kadarını seç.
        Seçmediğin soru bağlanmamış kalır.
      </p>

      {mappable.map((subject) => {
        const subjectRows = rows
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => row.resultId === subject.resultId);
        const groups = outcomeOptionGroups(
          catalog.find((item) => item.id === subject.subjectId),
        );
        const wrongChosen = subjectRows.filter(
          ({ row }) => row.kind === "wrong" && row.catalogItem,
        ).length;
        const blankChosen = subjectRows.filter(
          ({ row }) => row.kind === "blank" && row.catalogItem,
        ).length;

        return (
          <section
            key={subject.resultId}
            className="grid min-w-0 gap-3 rounded-xl border border-border p-3"
            aria-labelledby={`${prefix}-${subject.resultId}-title`}
          >
            <div>
              <h3
                id={`${prefix}-${subject.resultId}-title`}
                className="font-bold text-ink-900"
              >
                {subject.subjectName}
              </h3>
              <p className="text-sm text-ink-700">
                Yanlış {wrongChosen} / {subject.wrongCount}, boş {blankChosen} /{" "}
                {subject.blankCount} bağlandı.
              </p>
            </div>

            {groups.length === 0 ? (
              <p className="text-sm text-ink-700">Bu dersin kazanımları henüz eklenmedi.</p>
            ) : (
              <ul className="grid min-w-0 gap-3">
                {subjectRows.map(({ row, index }) => (
                  <li key={row.key} className="min-w-0">
                    <input
                      type="hidden"
                      name={`rows.${index}.resultId`}
                      value={row.resultId}
                    />
                    <input type="hidden" name={`rows.${index}.kind`} value={row.kind} />
                    <input
                      type="hidden"
                      name={`rows.${index}.sortOrder`}
                      value={String(index)}
                    />
                    <SelectField
                      id={`row${index}.catalogItem`}
                      name={`rows.${index}.catalogItem`}
                      label={row.label}
                      value={row.catalogItem}
                      onChange={(event) => setCatalogItem(row.key, event.target.value)}
                      placeholder="Kazanım seç"
                      groups={groups}
                      error={fieldErrors[`row${index}.catalogItem`]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Eşleştirmeleri kaydet"}
      </Button>
    </form>
  );
}
