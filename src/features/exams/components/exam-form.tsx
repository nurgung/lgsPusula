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
import { STUDY_DATE_MIN } from "@/features/study/calendar";
import { createExamAction, updateExamAction } from "@/features/exams/actions";
import {
  INITIAL_EXAM_FORM_STATE,
  type ExamFormState,
} from "@/features/exams/form-state";
import { LGS_SUBJECT_LABELS } from "@/features/exams/labels";
import {
  CURRENT_RULE_VERSION,
  getNetRule,
  type ExamType,
  type LgsSubjectCode,
} from "@/features/exams/net-rules";

type ExamAction = (state: ExamFormState, formData: FormData) => Promise<ExamFormState>;

type SubjectOption = { id: string; code: string; name: string };

type SubjectDefaults = {
  subjectId?: string;
  questionCount?: string;
  correctCount?: string;
  wrongCount?: string;
  blankCount?: string;
};

type FormDefaults = {
  title: string;
  takenOn: string;
  examType: ExamType;
  branch: Required<SubjectDefaults>;
  lgs: Partial<Record<LgsSubjectCode, Required<SubjectDefaults>>>;
};

export function ExamForm({
  mode,
  examId,
  subjects,
  today,
  defaults,
}: {
  mode: "create" | "edit";
  examId?: string;
  subjects: readonly SubjectOption[];
  today: string;
  defaults?: {
    title?: string;
    takenOn?: string;
    examType?: ExamType;
    branch?: SubjectDefaults;
    lgs?: Partial<Record<LgsSubjectCode, SubjectDefaults>>;
  };
}) {
  const action: ExamAction = mode === "create" ? createExamAction : updateExamAction;
  const [requestId] = useState(() => crypto.randomUUID());
  const [state, formAction, pending] = useActionState(action, INITIAL_EXAM_FORM_STATE);
  const prefix = useId();
  const submitted = state.status === "error" ? state.values : undefined;
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const rule = getNetRule(CURRENT_RULE_VERSION);

  const values: FormDefaults = {
    title: submitted?.title ?? defaults?.title ?? "",
    takenOn: submitted?.takenOn ?? defaults?.takenOn ?? today,
    examType: (submitted?.examType ?? defaults?.examType ?? "lgs_full") as ExamType,
    branch: {
      subjectId:
        submitted?.["branch.subjectId"] ?? defaults?.branch?.subjectId ?? "",
      questionCount:
        submitted?.["branch.questionCount"] ?? defaults?.branch?.questionCount ?? "",
      correctCount:
        submitted?.["branch.correctCount"] ?? defaults?.branch?.correctCount ?? "",
      wrongCount:
        submitted?.["branch.wrongCount"] ?? defaults?.branch?.wrongCount ?? "",
      blankCount:
        submitted?.["branch.blankCount"] ?? defaults?.branch?.blankCount ?? "",
    },
    lgs: Object.fromEntries(
      rule.examTypes.lgs_full.subjects.map((slot) => {
        const saved = defaults?.lgs?.[slot.code];
        return [
          slot.code,
          {
            subjectId: subjects.find((row) => row.code === slot.code)?.id ?? "",
            questionCount: String(slot.questionCount),
            correctCount:
              submitted?.[`${slot.code}.correctCount`] ?? saved?.correctCount ?? "",
            wrongCount:
              submitted?.[`${slot.code}.wrongCount`] ?? saved?.wrongCount ?? "",
            blankCount:
              submitted?.[`${slot.code}.blankCount`] ??
              saved?.blankCount ??
              String(slot.questionCount),
          },
        ];
      }),
    ) as FormDefaults["lgs"],
  };

  const errorEntries = Object.entries(fieldErrors).flatMap(([name, message]) =>
    message ? [{ fieldId: `${prefix}-${name}`, message }] : [],
  );

  return (
    <form action={formAction} className="grid min-w-0 gap-4" noValidate>
      {mode === "create" ? (
        <input type="hidden" name="requestId" value={requestId} />
      ) : (
        <input type="hidden" name="examId" value={examId ?? ""} />
      )}
      {errorEntries.length > 0 ? <FormErrorSummary errors={errorEntries} /> : null}
      {state.status === "error" && errorEntries.length === 0 ? (
        <StateMessage variant="error" title={fieldErrors.requestId || state.message} />
      ) : null}

      <ExamFields
        key={JSON.stringify(values)}
        prefix={prefix}
        subjects={subjects}
        today={today}
        fieldErrors={fieldErrors}
        defaults={values}
      />

      <div>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending
            ? "Kaydediliyor..."
            : mode === "create"
              ? "Denemeyi kaydet"
              : "Değişikliği kaydet"}
        </Button>
      </div>
    </form>
  );
}

function ExamFields({
  prefix,
  subjects,
  today,
  defaults,
  fieldErrors,
}: {
  prefix: string;
  subjects: readonly SubjectOption[];
  today: string;
  defaults: FormDefaults;
  fieldErrors: Record<string, string>;
}) {
  const rule = getNetRule(CURRENT_RULE_VERSION);
  const [selectedType, setSelectedType] = useState<ExamType>(defaults.examType);

  return (
    <div className="grid min-w-0 gap-4">
      <TextField
        id={`${prefix}-title`}
        name="title"
        label="Deneme adı"
        defaultValue={defaults.title}
        required
        maxLength={80}
        error={fieldErrors.title}
        autoComplete="off"
      />
      <TextField
        id={`${prefix}-takenOn`}
        name="takenOn"
        label="Deneme tarihi"
        type="date"
        defaultValue={defaults.takenOn}
        min={STUDY_DATE_MIN}
        max={today}
        required
        error={fieldErrors.takenOn}
        hint="Tarih, İstanbul gününe göre seçilir. İleri tarih yazılamaz."
      />
      <SelectField
        id={`${prefix}-examType`}
        name="examType"
        label="Deneme türü"
        value={selectedType}
        required
        error={fieldErrors.examType}
        onChange={(event) => setSelectedType(event.target.value as ExamType)}
        options={[
          { value: "lgs_full", label: "Tam LGS denemesi (90 soru)" },
          { value: "branch", label: "Branş denemesi (tek ders)" },
        ]}
      />

      {selectedType === "lgs_full" ? (
        <fieldset className="grid min-w-0 gap-4 rounded-xl border border-border p-3">
          <legend className="px-1 font-bold text-ink-900">Ders sonuçları</legend>
          <p className="text-sm text-ink-700">
            Her ders için doğru, yanlış ve boş yaz. Toplamları o dersin soru sayısına
            eşit olmalı. Net = doğru − (yanlış ÷ 3). Kural: {CURRENT_RULE_VERSION}.
          </p>
          {rule.examTypes.lgs_full.subjects.map((slot) => {
            const subject = subjects.find((row) => row.code === slot.code);
            const saved = defaults.lgs[slot.code];
            return (
              <div
                key={slot.code}
                className="grid min-w-0 gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0"
              >
                <h3 className="font-bold text-ink-900">
                  {subject?.name ?? LGS_SUBJECT_LABELS[slot.code] ?? slot.code} (
                  {slot.questionCount} soru)
                </h3>
                {subject ? (
                  <input type="hidden" name={`${slot.code}.subjectId`} value={subject.id} />
                ) : null}
                <input
                  type="hidden"
                  name={`${slot.code}.questionCount`}
                  value={String(slot.questionCount)}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <NumberField
                    id={`${prefix}-${slot.code}-correct`}
                    name={`${slot.code}.correctCount`}
                    label="Doğru"
                    defaultValue={saved?.correctCount ?? ""}
                    required
                    error={fieldErrors[`${slot.code}.correctCount`]}
                  />
                  <NumberField
                    id={`${prefix}-${slot.code}-wrong`}
                    name={`${slot.code}.wrongCount`}
                    label="Yanlış"
                    defaultValue={saved?.wrongCount ?? ""}
                    required
                    error={fieldErrors[`${slot.code}.wrongCount`]}
                  />
                  <NumberField
                    id={`${prefix}-${slot.code}-blank`}
                    name={`${slot.code}.blankCount`}
                    label="Boş"
                    defaultValue={saved?.blankCount ?? String(slot.questionCount)}
                    required
                    error={fieldErrors[`${slot.code}.blankCount`]}
                  />
                </div>
              </div>
            );
          })}
        </fieldset>
      ) : (
        <fieldset className="grid min-w-0 gap-3 rounded-xl border border-border p-3">
          <legend className="px-1 font-bold text-ink-900">Branş sonucu</legend>
          <p className="text-sm text-ink-700">
            Tek ders seç. Soru sayısı 1–100 olabilir. Net = doğru − (yanlış ÷ 3).
          </p>
          <SelectField
            id={`${prefix}-branch-subject`}
            name="branch.subjectId"
            label="Ders"
            defaultValue={defaults.branch.subjectId}
            required
            error={fieldErrors["branch.subjectId"]}
            placeholder="Ders seç"
            options={subjects.map((subject) => ({
              value: subject.id,
              label: subject.name,
            }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              id={`${prefix}-branch-questions`}
              name="branch.questionCount"
              label="Soru sayısı"
              defaultValue={defaults.branch.questionCount}
              required
              error={fieldErrors["branch.questionCount"]}
            />
            <NumberField
              id={`${prefix}-branch-correct`}
              name="branch.correctCount"
              label="Doğru"
              defaultValue={defaults.branch.correctCount}
              required
              error={fieldErrors["branch.correctCount"]}
            />
            <NumberField
              id={`${prefix}-branch-wrong`}
              name="branch.wrongCount"
              label="Yanlış"
              defaultValue={defaults.branch.wrongCount}
              required
              error={fieldErrors["branch.wrongCount"]}
            />
            <NumberField
              id={`${prefix}-branch-blank`}
              name="branch.blankCount"
              label="Boş"
              defaultValue={defaults.branch.blankCount}
              required
              error={fieldErrors["branch.blankCount"]}
            />
          </div>
        </fieldset>
      )}
    </div>
  );
}
