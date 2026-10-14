"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  FormErrorSummary,
  NumberField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { INITIAL_CATALOG_FORM_STATE, type CatalogFormState } from "../form-state";

export type CatalogFieldSpec = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "number";
  hint?: string;
  defaultValue?: string;
  optional?: boolean;
  maxLength?: number;
  /** Codes are typed exactly as written; no spell check or auto-capitalising. */
  code?: boolean;
};

export function CatalogForm({
  action,
  fields,
  hidden = {},
  submitLabel,
  pendingLabel,
  idPrefix,
}: {
  action: (state: CatalogFormState, formData: FormData) => Promise<CatalogFormState>;
  fields: readonly CatalogFieldSpec[];
  hidden?: Record<string, string>;
  submitLabel: string;
  pendingLabel: string;
  idPrefix: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_CATALOG_FORM_STATE);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? state.values : undefined;
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const summary = fields
    .filter((field) => fieldErrors[field.name])
    .map((field) => ({
      fieldId: fieldId(field.name),
      message: fieldErrors[field.name]!,
    }));

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "success" ? (
        <StateMessage variant="success" title={state.message} />
      ) : null}
      {state.status === "error" && summary.length > 0 ? (
        <FormErrorSummary errors={summary} />
      ) : null}
      {state.status === "error" && summary.length === 0 ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}

      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {/* Remount with the submitted values so an error does not wipe what was typed. */}
      <div key={JSON.stringify(values ?? null)} className="grid gap-4">
        {fields.map((field) => {
          const common = {
            id: fieldId(field.name),
            name: field.name,
            label: field.label,
            hint: field.hint,
            optional: field.optional,
            error: fieldErrors[field.name],
            defaultValue: values?.[field.name] ?? field.defaultValue,
          };
          if (field.kind === "textarea") {
            return (
              <TextAreaField key={field.name} {...common} maxLength={field.maxLength} />
            );
          }
          if (field.kind === "number") {
            return <NumberField key={field.name} {...common} />;
          }
          return (
            <TextField
              key={field.name}
              {...common}
              maxLength={field.maxLength}
              autoComplete="off"
              spellCheck={field.code ? false : undefined}
              autoCapitalize={field.code ? "off" : undefined}
            />
          );
        })}
      </div>

      <div>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
