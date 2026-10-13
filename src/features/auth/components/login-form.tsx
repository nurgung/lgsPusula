"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { signInAction } from "../actions";
import { INITIAL_AUTH_FORM_STATE } from "../form-state";

const FIELD_IDS = { username: "giris-kullanici-adi", password: "giris-parola" } as const;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInAction,
    INITIAL_AUTH_FORM_STATE,
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const summary = Object.entries(fieldErrors).flatMap(([field, message]) =>
    field in FIELD_IDS
      ? [{ fieldId: FIELD_IDS[field as keyof typeof FIELD_IDS], message }]
      : [],
  );
  const username = state.status === "error" ? state.values?.username : undefined;

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {state.status === "error" && summary.length > 0 ? (
        <FormErrorSummary errors={summary} />
      ) : null}
      {state.status === "error" && summary.length === 0 ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <TextField
        // Remount with the echoed value after a failed attempt.
        key={`username-${username ?? ""}`}
        id={FIELD_IDS.username}
        name="username"
        label="Kullanıcı adı"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={username}
        error={fieldErrors.username}
      />
      <TextField
        id={FIELD_IDS.password}
        name="password"
        type="password"
        label="Parola"
        autoComplete="current-password"
        required
        error={fieldErrors.password}
      />
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Giriş yapılıyor..." : "Giriş yap"}
      </Button>
      <p className="text-sm text-ink-600">
        Parolanı unuttuysan velinden yeni bir geçici parola isteyebilirsin.
      </p>
    </form>
  );
}
