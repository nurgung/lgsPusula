"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StateMessage } from "@/components/ui/state-message";
import { signOutAction, signOutEverywhereAction } from "../actions";
import { INITIAL_AUTH_FORM_STATE } from "../form-state";

export function SignOutControls() {
  const [localState, signOutLocal, localPending] = useActionState(
    signOutAction,
    INITIAL_AUTH_FORM_STATE,
  );
  const [globalState, signOutGlobal, globalPending] = useActionState(
    signOutEverywhereAction,
    INITIAL_AUTH_FORM_STATE,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();
  const pending = localPending || globalPending;
  const error =
    localState.status === "error"
      ? localState.message
      : globalState.status === "error"
        ? globalState.message
        : null;

  return (
    <div className="grid gap-4">
      {error ? <StateMessage variant="error" title={error} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={signOutLocal}>
          <Button
            type="submit"
            variant="secondary"
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {localPending ? "Çıkış yapılıyor..." : "Çıkış yap"}
          </Button>
        </form>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
          className="w-full sm:w-auto"
        >
          Tüm cihazlarda çıkış yap
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Tüm cihazlarda çıkış yapılsın mı?"
        description="Bu hesapla açık olan bütün oturumlar kapanır; bu cihaz dahil. Tekrar girmek için parolan gerekir."
        confirmLabel="Hepsinden çıkış yap"
        pending={globalPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => startTransition(() => signOutGlobal())}
      />
    </div>
  );
}
