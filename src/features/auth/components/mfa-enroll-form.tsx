"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { enrollMfaAction } from "../mfa-actions";
import { INITIAL_MFA_ENROLL_STATE } from "../mfa-state";
import { MfaVerifyForm } from "./mfa-verify-form";

export function MfaEnrollForm() {
  const [state, action, pending] = useActionState(
    enrollMfaAction,
    INITIAL_MFA_ENROLL_STATE,
  );

  if (state.status === "ready") {
    return <MfaVerifyForm factorId={state.factorId} secret={state.secret} />;
  }

  return (
    <form action={action} className="grid gap-4">
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <p className="text-ink-700">
        Yönetim sayfası için telefonundaki kimlik doğrulayıcı uygulamasını bir kez kurman
        gerekir. Veli sayfaları bu adım olmadan da açılır.
      </p>
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Hazırlanıyor..." : "Kuruluma başla"}
      </Button>
    </form>
  );
}
