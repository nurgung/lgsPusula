"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, NumberField, SelectField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { saveStudyGoalAction } from "@/features/study/actions";
import { INITIAL_STUDY_FORM_STATE } from "@/features/study/form-state";

export function GoalForm({
  subjects,
}: {
  subjects: readonly { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    saveStudyGoalAction,
    INITIAL_STUDY_FORM_STATE,
  );
  const prefix = useId();
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? state.values : undefined;
  const fields = [
    ["period", `${prefix}-period`],
    ["subjectId", `${prefix}-subjectId`],
    ["targetQuestions", `${prefix}-targetQuestions`],
  ] as const;
  const errors = fields.flatMap(([name, fieldId]) => {
    const message = fieldErrors[name];
    return message ? [{ fieldId, message }] : [];
  });

  return (
    <form action={formAction} className="grid min-w-0 gap-4" noValidate>
      {state.status === "error" && errors.length > 0 ? (
        <FormErrorSummary errors={errors} />
      ) : null}
      {state.status === "error" && errors.length === 0 ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <div key={JSON.stringify(values ?? null)} className="grid min-w-0 gap-4">
        <SelectField
          id={`${prefix}-period`}
          name="period"
          label="Dönem"
          hint="Günlük hedef bugün içindir. Haftalık hedef pazartesiden pazara kadardır."
          options={[
            { value: "day", label: "Günlük" },
            { value: "week", label: "Haftalık" },
          ]}
          defaultValue={values?.period ?? "day"}
          error={fieldErrors.period}
        />
        <SelectField
          id={`${prefix}-subjectId`}
          name="subjectId"
          label="Ders"
          hint="Tüm dersler, hedefin her dersteki soruları birlikte sayar."
          options={[
            { value: "", label: "Tüm dersler" },
            ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
          ]}
          defaultValue={values?.subjectId ?? ""}
          error={fieldErrors.subjectId}
        />
        <NumberField
          id={`${prefix}-targetQuestions`}
          name="targetQuestions"
          label="Hedef"
          unit="soru"
          hint="Kaç soru çözmek istediğini yaz."
          error={fieldErrors.targetQuestions}
          defaultValue={values?.targetQuestions}
        />
      </div>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? "Kaydediliyor..." : "Hedefi kaydet"}
        </Button>
      </div>
    </form>
  );
}
