"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { createInviteAction } from "../actions";
import { INITIAL_FAMILY_FORM_STATE } from "../form-state";

export function CreateInviteForm() {
  const [state, action, pending] = useActionState(
    createInviteAction,
    INITIAL_FAMILY_FORM_STATE,
  );
  const code = state.status === "success" ? state.code : undefined;

  return (
    <form action={action} className="grid gap-4">
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      {code ? (
        <div className="grid gap-2">
          <StateMessage
            variant="success"
            title="Kodun hazır."
            description="Bu kod 24 saat geçerli ve bir kez kullanılabilir. Veline kendin söyle; e-posta ile gönderilmez. Sayfadan ayrılırsan yeni bir kod üretmen gerekir. Yeni kod, eskisini geçersiz kılar."
          />
          <p className="font-mono text-2xl font-bold tracking-widest break-all text-ink-900">
            <span className="sr-only">Davet kodun: </span>
            <span data-testid="invite-code" translate="no">
              {code}
            </span>
          </p>
        </div>
      ) : null}
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Kod hazırlanıyor..." : code ? "Yeni kod oluştur" : "Veli bağla"}
      </Button>
    </form>
  );
}
