"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { completePracticeAction } from "../actions";
import { INITIAL_PRACTICE_STATE } from "../form-state";
import { COACHING_MESSAGES } from "../messages";

export function CompletePracticeButton({ outcomeId }: { outcomeId: string }) {
  const [state, action, pending] = useActionState(
    completePracticeAction,
    INITIAL_PRACTICE_STATE,
  );

  return (
    <form action={action} className="grid min-w-0 gap-3">
      <input type="hidden" name="outcomeId" value={outcomeId} />
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? COACHING_MESSAGES.completePending : COACHING_MESSAGES.completeLabel}
        </Button>
      </div>
    </form>
  );
}
