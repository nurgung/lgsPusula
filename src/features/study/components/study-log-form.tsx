"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FormErrorSummary,
  NumberField,
  SelectField,
  TextField,
} from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import type { CatalogSubject } from "@/features/curriculum/catalog";
import { CurriculumPicker } from "@/features/curriculum/components/curriculum-picker";
import { STUDY_DATE_MIN } from "@/features/study/calendar";
import { createStudyLogAction, updateStudyLogAction } from "@/features/study/actions";
import {
  INITIAL_STUDY_FORM_STATE,
  type StudyFormState,
} from "@/features/study/form-state";

type LogAction = (state: StudyFormState, formData: FormData) => Promise<StudyFormState>;

const FIELDS = [
  ["studiedOn", "studiedOn"],
  ["subjectId", "subjectId"],
  ["catalogItem", "catalogItem"],
  ["questionCount", "questionCount"],
  ["correctCount", "correctCount"],
  ["wrongCount", "wrongCount"],
  ["blankCount", "blankCount"],
  ["durationMinutes", "durationMinutes"],
] as const;

type LogDefaults = {
  studiedOn?: string;
  subjectId?: string;
  catalogItem?: string;
  questionCount?: string;
  correctCount?: string;
  wrongCount?: string;
  blankCount?: string;
  durationMinutes?: string;
};

export function StudyLogForm({
  mode,
  logId,
  catalog,
  subjects,
  today,
  defaults,
  showPicker = true,
  keptSelectionLabel,
}: {
  mode: "create" | "edit";
  logId?: string;
  catalog: readonly CatalogSubject[];
  subjects: readonly { id: string; name: string }[];
  today: string;
  defaults?: LogDefaults;
  /** Quick entry skips the topic picker. The full form keeps it optional. */
  showPicker?: boolean;
  /** Shown when the saved topic is archived and no longer listed. */
  keptSelectionLabel?: string;
}) {
  const action: LogAction =
    mode === "create" ? createStudyLogAction : updateStudyLogAction;
  const [requestId] = useState(() => crypto.randomUUID());
  const [state, formAction, pending] = useActionState(action, INITIAL_STUDY_FORM_STATE);
  const prefix = useId();
  const submitted = state.status === "error" ? state.values : undefined;
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const errors = FIELDS.flatMap(([name]) => {
    const message = fieldErrors[name];
    return message ? [{ fieldId: `${prefix}-${name}`, message }] : [];
  });
  const values: Required<LogDefaults> = {
    studiedOn: submitted?.studiedOn ?? defaults?.studiedOn ?? today,
    subjectId: submitted?.subjectId ?? defaults?.subjectId ?? "",
    catalogItem: submitted?.catalogItem ?? defaults?.catalogItem ?? "",
    questionCount: submitted?.questionCount ?? defaults?.questionCount ?? "",
    correctCount: submitted?.correctCount ?? defaults?.correctCount ?? "",
    wrongCount: submitted?.wrongCount ?? defaults?.wrongCount ?? "",
    blankCount: submitted?.blankCount ?? defaults?.blankCount ?? "",
    durationMinutes: submitted?.durationMinutes ?? defaults?.durationMinutes ?? "",
  };

  return (
    <form action={formAction} className="grid min-w-0 gap-4" noValidate>
      {mode === "create" ? (
        <input type="hidden" name="requestId" value={requestId} />
      ) : (
        <input type="hidden" name="logId" value={logId ?? ""} />
      )}
      {state.status === "error" && errors.length > 0 ? (
        <FormErrorSummary errors={errors} />
      ) : null}
      {state.status === "error" && errors.length === 0 ? (
        <StateMessage variant="error" title={fieldErrors.requestId || state.message} />
      ) : null}
      <StudyLogFields
        key={JSON.stringify(values)}
        prefix={prefix}
        catalog={catalog}
        subjects={subjects}
        today={today}
        showPicker={showPicker}
        keptSelectionLabel={keptSelectionLabel}
        fieldErrors={fieldErrors}
        defaults={values}
      />
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending
            ? "Kaydediliyor..."
            : mode === "create"
              ? "Kaydı ekle"
              : "Değişikliği kaydet"}
        </Button>
      </div>
    </form>
  );
}

function StudyLogFields({
  prefix,
  catalog,
  subjects,
  today,
  defaults,
  fieldErrors,
  showPicker,
  keptSelectionLabel,
}: {
  prefix: string;
  catalog: readonly CatalogSubject[];
  subjects: readonly { id: string; name: string }[];
  today: string;
  defaults: Required<LogDefaults>;
  fieldErrors: Record<string, string>;
  showPicker: boolean;
  keptSelectionLabel?: string;
}) {
  const [subjectId, setSubjectId] = useState(defaults.subjectId);
  const subjectCatalog = catalog.filter((subject) => subject.id === subjectId);

  return (
    <div className="grid min-w-0 gap-4">
      <TextField
        id={`${prefix}-studiedOn`}
        name="studiedOn"
        type="date"
        label="Tarih"
        hint="Türkiye saati (İstanbul). Gün, gece yarısı değişir."
        min={STUDY_DATE_MIN}
        max={today}
        error={fieldErrors.studiedOn}
        defaultValue={defaults.studiedOn}
      />
      <SelectField
        id={`${prefix}-subjectId`}
        name="subjectId"
        label="Ders"
        placeholder="Ders seç"
        options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
        error={fieldErrors.subjectId}
      />
      {showPicker ? (
        <div id={`${prefix}-catalogItem`} className="min-w-0">
          {fieldErrors.catalogItem ? (
            <p className="mb-2 text-sm font-semibold text-danger-700">
              {fieldErrors.catalogItem}
            </p>
          ) : null}
          {keptSelectionLabel && subjectId === defaults.subjectId ? (
            <p className="mb-2 text-sm text-ink-700">
              Seçili konu: {keptSelectionLabel}. Değiştirmezsen aynı konu kalır.
            </p>
          ) : null}
          {subjectId ? (
            <CurriculumPicker
              key={subjectId}
              catalog={subjectCatalog}
              fixedSubjectId={subjectId}
              optional
              legend="Konu veya kazanım"
              defaultValue={subjectId === defaults.subjectId ? defaults.catalogItem : ""}
            />
          ) : (
            <>
              <input type="hidden" name="catalogItem" value="" />
              <p className="text-sm text-ink-600">Konu seçmek için önce dersi seç.</p>
            </>
          )}
        </div>
      ) : (
        <input type="hidden" name="catalogItem" value="" />
      )}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <NumberField
          id={`${prefix}-questionCount`}
          name="questionCount"
          label="Soru sayısı"
          unit="soru"
          hint="Doğru, yanlış ve boş sayılarının toplamı bu sayı olmalı."
          error={fieldErrors.questionCount}
          defaultValue={defaults.questionCount}
        />
        <NumberField
          id={`${prefix}-correctCount`}
          name="correctCount"
          label="Doğru"
          unit="soru"
          error={fieldErrors.correctCount}
          defaultValue={defaults.correctCount}
        />
        <NumberField
          id={`${prefix}-wrongCount`}
          name="wrongCount"
          label="Yanlış"
          unit="soru"
          error={fieldErrors.wrongCount}
          defaultValue={defaults.wrongCount}
        />
        <NumberField
          id={`${prefix}-blankCount`}
          name="blankCount"
          label="Boş"
          unit="soru"
          error={fieldErrors.blankCount}
          defaultValue={defaults.blankCount}
        />
      </div>
      <NumberField
        id={`${prefix}-durationMinutes`}
        name="durationMinutes"
        label="Süre"
        unit="dakika"
        hint="Ölçmediysen 0 yazabilirsin."
        error={fieldErrors.durationMinutes}
        defaultValue={defaults.durationMinutes}
      />
    </div>
  );
}
