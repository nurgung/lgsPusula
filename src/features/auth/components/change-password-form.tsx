"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { changePasswordAction } from "../actions";
import { INITIAL_AUTH_FORM_STATE } from "../form-state";
import { PASSWORD_MIN_LENGTH } from "../schemas";

const FIELD_IDS = {
  currentPassword: "parola-mevcut",
  newPassword: "parola-yeni",
  confirmPassword: "parola-yeni-tekrar",
} as const;

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    INITIAL_AUTH_FORM_STATE,
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const summary = Object.entries(fieldErrors).flatMap(([field, message]) =>
    field in FIELD_IDS
      ? [{ fieldId: FIELD_IDS[field as keyof typeof FIELD_IDS], message }]
      : [],
  );

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" && summary.length > 0 ? (
        <FormErrorSummary errors={summary} />
      ) : null}
      {state.status === "error" && summary.length === 0 ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <TextField
        id={FIELD_IDS.currentPassword}
        name="currentPassword"
        type="password"
        label="Şu anki parola"
        hint="İlk girişse sana verilen geçici parolayı yaz."
        autoComplete="current-password"
        required
        error={fieldErrors.currentPassword}
      />
      <TextField
        id={FIELD_IDS.newPassword}
        name="newPassword"
        type="password"
        label="Yeni parola"
        hint={`En az ${PASSWORD_MIN_LENGTH} karakter; en az bir harf ve bir rakam olsun. Başka yerde kullandığın bir parolayı seçme.`}
        autoComplete="new-password"
        required
        error={fieldErrors.newPassword}
      />
      <TextField
        id={FIELD_IDS.confirmPassword}
        name="confirmPassword"
        type="password"
        label="Yeni parola (tekrar)"
        autoComplete="new-password"
        required
        error={fieldErrors.confirmPassword}
      />
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Kaydediliyor..." : "Parolayı değiştir"}
      </Button>
    </form>
  );
}
