"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { respondLinkAction } from "../actions";
import { INITIAL_FAMILY_FORM_STATE } from "../form-state";

export function RespondLinkForms({ linkId }: { linkId: string }) {
  const [state, action, pending] = useActionState(
    respondLinkAction,
    INITIAL_FAMILY_FORM_STATE,
  );

  return (
    <div className="grid gap-4">
      {state.status === "success" ? (
        <StateMessage variant="success" title={state.message} />
      ) : null}
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={action}>
          <input type="hidden" name="linkId" value={linkId} />
          <input type="hidden" name="decision" value="approve" />
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            {pending ? "İşleniyor..." : "Onayla"}
          </Button>
        </form>
        <form action={action}>
          <input type="hidden" name="linkId" value={linkId} />
          <input type="hidden" name="decision" value="decline" />
          <Button
            type="submit"
            variant="secondary"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            Reddet
          </Button>
        </form>
      </div>
    </div>
  );
}
