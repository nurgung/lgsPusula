"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { verifyMfaAction } from "../mfa-actions";
import { INITIAL_MFA_VERIFY_STATE } from "../mfa-state";

export function MfaVerifyForm({
  factorId,
  secret,
}: {
  factorId: string;
  secret?: string;
}) {
  const [state, action, pending] = useActionState(
    verifyMfaAction,
    INITIAL_MFA_VERIFY_STATE,
  );
  const codeError = state.status === "error" ? state.fieldErrors?.code : undefined;

  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="factorId" value={factorId} />
      {secret ? (
        <div className="grid gap-3">
          <p className="text-ink-700">
            Bu anahtarı yalnızca telefonundaki kimlik doğrulayıcı uygulamaya yaz. Öğrenciye
            söyleme; öğrenci bağlama kodu değildir. Anahtar yalnızca bu ekranda görünür.
          </p>
          <p className="font-mono text-lg font-bold break-all text-ink-900">
            <span className="sr-only">Kurulum anahtarı: </span>
            <span data-testid="mfa-secret" translate="no">
              {secret}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-ink-700">
          Kimlik doğrulayıcı uygulamandaki 6 haneli kodu yaz. Bu, öğrencinin davet kodu
          değildir. Yönetim sayfası bu kod olmadan açılmaz.
        </p>
      )}
      {state.status === "error" && !codeError ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <TextField
        id="mfa-kod"
        name="code"
        label="Doğrulama kodu"
        hint="6 hane. Kod her 30 saniyede bir yenilenir."
        inputMode="numeric"
        autoComplete="one-time-code"
        spellCheck={false}
        required
        maxLength={6}
        error={codeError}
      />
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Kod kontrol ediliyor..." : "Doğrula"}
      </Button>
    </form>
  );
}
