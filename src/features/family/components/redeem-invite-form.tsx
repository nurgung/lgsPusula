"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, TextField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { redeemInviteAction } from "../actions";
import { INITIAL_FAMILY_FORM_STATE } from "../form-state";

const CODE_FIELD_ID = "veli-davet-kodu";

export function RedeemInviteForm() {
  const [state, action, pending] = useActionState(
    redeemInviteAction,
    INITIAL_FAMILY_FORM_STATE,
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const codeError = fieldErrors.code;
  const summary = codeError ? [{ fieldId: CODE_FIELD_ID, message: codeError }] : [];
  const code = state.status === "error" ? state.values?.code : undefined;

  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.status === "success" ? (
        <StateMessage variant="success" title={state.message} />
      ) : null}
      {state.status === "error" && summary.length > 0 ? (
        <FormErrorSummary errors={summary} />
      ) : null}
      {state.status === "error" && summary.length === 0 ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <TextField
        key={`code-${code ?? ""}`}
        id={CODE_FIELD_ID}
        name="code"
        label="Davet kodu"
        hint="Öğrencinin sana söylediği kod."
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        defaultValue={code}
        error={codeError}
      />
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Kod kontrol ediliyor..." : "Kodu gönder"}
      </Button>
    </form>
  );
}
