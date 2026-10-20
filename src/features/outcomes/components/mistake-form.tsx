"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, SelectField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { CurriculumPicker } from "@/features/curriculum/components/curriculum-picker";
import type { CatalogSubject } from "@/features/curriculum/catalog";
import { replaceExamMistakesAction } from "../actions";
import { initialOutcomeFormState, type OutcomeFormState } from "../form-state";
import { OUTCOME_MESSAGES } from "../messages";

type SubjectSlot = {
  resultId: string;
  subjectId: string;
  subjectName: string;
  wrongCount: number;
  blankCount: number;
};

type DraftRow = {
  key: string;
  resultId: string;
  subjectId: string;
  kind: "wrong" | "blank";
  catalogItem: string;
};

function countKind(
  rows: readonly DraftRow[],
  resultId: string,
  kind: "wrong" | "blank",
): number {
  return rows.filter((row) => row.resultId === resultId && row.kind === kind).length;
}

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
    kind: "wrong" | "blank";
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

  const [rows, setRows] = useState<DraftRow[]>(() =>
    initialRows.map((row, index) => {
      const subject = subjects.find((item) => item.resultId === row.resultId);
      return {
        key: `${row.resultId}-${index}`,
        resultId: row.resultId,
        subjectId: subject?.subjectId ?? "",
        kind: row.kind,
        catalogItem: `outcome:${row.outcomeId}`,
      };
    }),
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

  const addRow = (subject: SubjectSlot, kind: "wrong" | "blank") => {
    const limit = kind === "wrong" ? subject.wrongCount : subject.blankCount;
    if (countKind(rows, subject.resultId, kind) >= limit) return;
    setRows((current) => [
      ...current,
      {
        key: `${subject.resultId}-${kind}-${crypto.randomUUID()}`,
        resultId: subject.resultId,
        subjectId: subject.subjectId,
        kind,
        catalogItem: "",
      },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  return (
    <form action={formAction} className="grid min-w-0 gap-5" noValidate>
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="rowCount" value={rows.length} />

      {errorEntries.length > 0 ? <FormErrorSummary errors={errorEntries} /> : null}
      {state.status === "error" && errorEntries.length === 0 && state.message ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}

      {mappable.map((subject) => {
        const subjectRows = rows
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => row.resultId === subject.resultId);
        const wrongUsed = countKind(rows, subject.resultId, "wrong");
        const blankUsed = countKind(rows, subject.resultId, "blank");
        const subjectCatalog = catalog.filter((item) => item.id === subject.subjectId);

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
                Yanlış {subject.wrongCount}, boş {subject.blankCount}. Bağlanan: yanlış{" "}
                {wrongUsed}/{subject.wrongCount}, boş {blankUsed}/{subject.blankCount}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={pending || wrongUsed >= subject.wrongCount}
                onClick={() => addRow(subject, "wrong")}
              >
                Yanlış ekle
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || blankUsed >= subject.blankCount}
                onClick={() => addRow(subject, "blank")}
              >
                Boş ekle
              </Button>
            </div>

            {subjectRows.length === 0 ? (
              <p className="text-sm text-ink-700">
                Henüz eşleştirme yok. İstersen hepsini boş bırakabilirsin; o zaman kazanım
                analizi yapılmış sayılmaz.
              </p>
            ) : (
              <ul className="grid min-w-0 gap-4">
                {subjectRows.map(({ row, index }) => (
                  <li
                    key={row.key}
                    className="grid min-w-0 gap-3 rounded-xl border border-border bg-canvas p-3"
                  >
                    <input
                      type="hidden"
                      name={`rows.${index}.resultId`}
                      value={row.resultId}
                    />
                    <input
                      type="hidden"
                      name={`rows.${index}.sortOrder`}
                      value={String(index)}
                    />
                    <SelectField
                      id={`${prefix}-kind-${row.key}`}
                      name={`rows.${index}.kind`}
                      label="Tür"
                      value={row.kind}
                      onChange={(event) => {
                        const next = event.target.value === "blank" ? "blank" : "wrong";
                        setRows((current) =>
                          current.map((item) =>
                            item.key === row.key ? { ...item, kind: next } : item,
                          ),
                        );
                      }}
                      options={[
                        { value: "wrong", label: "Yanlış" },
                        { value: "blank", label: "Boş" },
                      ]}
                      error={fieldErrors[`row${index}.kind`]}
                    />
                    <CurriculumPicker
                      catalog={subjectCatalog}
                      name={`rows.${index}.catalogItem`}
                      legend="Kazanım"
                      fixedSubjectId={subject.subjectId}
                      outcomesOnly
                      defaultValue={row.catalogItem}
                      onChange={(selection) => {
                        const value =
                          selection?.kind === "outcome" ? `outcome:${selection.id}` : "";
                        setRows((current) =>
                          current.map((item) =>
                            item.key === row.key ? { ...item, catalogItem: value } : item,
                          ),
                        );
                      }}
                    />
                    {fieldErrors[`row${index}.catalogItem`] ? (
                      <p className="text-sm text-danger-700" role="alert">
                        {fieldErrors[`row${index}.catalogItem`]}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeRow(row.key)}
                      disabled={pending}
                    >
                      Bu satırı kaldır
                    </Button>
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
