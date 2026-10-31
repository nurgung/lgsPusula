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
    <div className="grid gap-4">
      <p className="text-sm text-ink-700">{REPORT_MESSAGES.downloadHint}</p>
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <form action={action} className="grid gap-3">
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="scope" value="week" />
        <p className="text-sm font-semibold text-ink-900">Haftalık PDF</p>
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
      <form action={action} className="grid gap-3">
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="scope" value="month" />
        <p className="text-sm font-semibold text-ink-900">Aylık PDF</p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            name="period"
            value="current"
            variant="secondary"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending
              ? REPORT_MESSAGES.preparing
              : REPORT_MESSAGES.downloadMonthCurrent}
          </Button>
          <Button
            type="submit"
            name="period"
            value="previous"
            variant="secondary"
            disabled={pending}
          >
            {pending
              ? REPORT_MESSAGES.preparing
              : REPORT_MESSAGES.downloadMonthPrevious}
          </Button>
        </div>
      </form>
    </div>
  );
}
