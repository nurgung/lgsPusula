"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StateMessage } from "@/components/ui/state-message";
import { deleteExamAction } from "@/features/exams/actions";
import { INITIAL_EXAM_FORM_STATE } from "@/features/exams/form-state";
import { EXAM_MESSAGES } from "@/features/exams/messages";

export function DeleteExamButton({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteExamAction,
    INITIAL_EXAM_FORM_STATE,
  );
  const [, startTransition] = useTransition();

  return (
    <div className="grid gap-4">
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <div>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={pending}>
          Denemeyi sil
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title="Bu denemeyi silmek istiyor musun?"
        description={EXAM_MESSAGES.deleteConfirm}
        confirmLabel="Denemeyi sil"
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          const data = new FormData();
          data.set("examId", examId);
          setOpen(false);
          startTransition(() => {
            formAction(data);
          });
        }}
      />
    </div>
  );
}
