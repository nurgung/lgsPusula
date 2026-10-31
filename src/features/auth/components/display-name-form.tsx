"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { updateDisplayNameAction } from "../display-name-action";
import {
  AUTH_MESSAGES,
  INITIAL_DISPLAY_NAME_FORM_STATE,
} from "../form-state";
import { DISPLAY_NAME_MAX_LENGTH } from "../schemas";

const FIELD_ID = "hesap-gorunen-ad";

export function DisplayNameForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(
    updateDisplayNameAction,
    INITIAL_DISPLAY_NAME_FORM_STATE,
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const summary = fieldErrors.displayName
    ? [{ fieldId: FIELD_ID, message: fieldErrors.displayName }]
    : [];
  const currentValue =
    state.status === "saved"
      ? state.displayName
      : (state.status === "error" ? state.values?.displayName : undefined) ??
        displayName;

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <p className="text-sm text-ink-700">
        Bu ad ana sayfada “Merhaba” diye görünür. Kullanıcı adın değişmez.
      </p>
      {state.status === "error" && summary.length > 0 ? (
        <FormErrorSummary errors={summary} />
      ) : null}
      {state.status === "error" && summary.length === 0 ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      {state.status === "saved" ? (
        <StateMessage variant="success" title={AUTH_MESSAGES.displayNameSaved} />
      ) : null}
      <TextField
        key={
          state.status === "saved"
            ? `saved:${state.displayName}`
            : state.status === "error"
              ? `error:${state.values?.displayName ?? ""}`
              : "idle"
        }
        id={FIELD_ID}
        name="displayName"
        label="Görünen ad"
        hint={`Adın veya istediğin bir takma ad. En fazla ${DISPLAY_NAME_MAX_LENGTH} karakter.`}
        autoComplete="nickname"
        required
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        defaultValue={currentValue}
        error={fieldErrors.displayName}
      />
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Kaydediliyor..." : "Adımı kaydet"}
      </Button>
    </form>
  );
}
