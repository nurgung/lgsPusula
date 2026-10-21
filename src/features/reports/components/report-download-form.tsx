"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { requestWeeklyReportAction } from "../actions";
import { INITIAL_REPORT_FORM_STATE } from "../form-state";
import { REPORT_MESSAGES } from "../messages";

export function ReportDownloadForm({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState(
    requestWeeklyReportAction,
    INITIAL_REPORT_FORM_STATE,
  );

  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-ink-700">{REPORT_MESSAGES.downloadHint}</p>
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          name="period"
          value="current"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? REPORT_MESSAGES.preparing : REPORT_MESSAGES.downloadCurrent}
        </Button>
        <Button
          type="submit"
          name="period"
          value="previous"
          variant="secondary"
          disabled={pending}
        >
          {pending ? REPORT_MESSAGES.preparing : REPORT_MESSAGES.downloadPrevious}
        </Button>
      </div>
    </form>
  );
}
