"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StateMessage } from "@/components/ui/state-message";
import { deleteStudyGoalAction, deleteStudyLogAction } from "@/features/study/actions";
import { INITIAL_STUDY_FORM_STATE } from "@/features/study/form-state";

function ConfirmDelete({
  idField,
  id,
  title,
  description,
  confirmLabel,
  action,
}: {
  idField: "logId" | "goalId";
  id: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: typeof deleteStudyLogAction;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, INITIAL_STUDY_FORM_STATE);
  const [, startTransition] = useTransition();

  return (
    <div className="grid gap-4">
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <div>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={pending}>
          {confirmLabel}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          const data = new FormData();
          data.set(idField, id);
          setOpen(false);
          startTransition(() => {
            formAction(data);
          });
        }}
      />
    </div>
  );
}

export function DeleteLogButton({ logId }: { logId: string }) {
  return (
    <ConfirmDelete
      idField="logId"
      id={logId}
      title="Bu kaydı silmek istiyor musun?"
      description="Kayıt silinir. İstersen aynı çalışmayı sonra yeniden yazabilirsin."
      confirmLabel="Kaydı sil"
      action={deleteStudyLogAction}
    />
  );
}

export function DeleteGoalButton({ goalId }: { goalId: string }) {
  return (
    <ConfirmDelete
      idField="goalId"
      id={goalId}
      title="Bu hedefi kaldırmak istiyor musun?"
      description="Hedef silinir. İstediğin zaman yeni bir hedef yazabilirsin."
      confirmLabel="Hedefi kaldır"
      action={deleteStudyGoalAction}
    />
  );
}
