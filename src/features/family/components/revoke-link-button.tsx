"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StateMessage } from "@/components/ui/state-message";
import { revokeLinkAction } from "../actions";
import { INITIAL_FAMILY_FORM_STATE } from "../form-state";

export function RevokeLinkButton({
  linkId,
  description,
}: {
  linkId: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    revokeLinkAction,
    INITIAL_FAMILY_FORM_STATE,
  );
  const [, startTransition] = useTransition();

  return (
    <div className="grid gap-4">
      {state.status === "success" ? (
        <StateMessage variant="success" title={state.message} />
      ) : null}
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <div>
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          disabled={pending || state.status === "success"}
        >
          Bağlantıyı kaldır
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title="Bağlantıyı kaldırmak istiyor musun?"
        description={description}
        confirmLabel="Bağlantıyı kaldır"
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          const data = new FormData();
          data.set("linkId", linkId);
          setOpen(false);
          startTransition(() => {
            action(data);
          });
        }}
      />
    </div>
  );
}
