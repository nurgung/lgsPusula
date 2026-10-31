"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { requestWeeklyReportAction } from "../actions";
import { INITIAL_REPORT_FORM_STATE } from "../form-state";
import { REPORT_MESSAGES } from "../messages";
import type { ReportScope } from "../periods";

type PeriodChoice = "current" | "previous";

function PdfScopeForm({
  studentId,
  scope,
  title,
  currentLabel,
  previousLabel,
}: {
  studentId: string;
  scope: ReportScope;
  title: string;
  currentLabel: string;
  previousLabel: string;
}) {
  const [state, action, pending] = useActionState(
    requestWeeklyReportAction,
    INITIAL_REPORT_FORM_STATE,
  );
  const [activePeriod, setActivePeriod] = useState<PeriodChoice | null>(null);

  useEffect(() => {
    if (!pending) setActivePeriod(null);
  }, [pending]);

  function submitPeriod(period: PeriodChoice) {
    return (formData: FormData) => {
      setActivePeriod(period);
      formData.set("scope", scope);
      formData.set("period", period);
      return action(formData);
    };
  }

  return (
    <form className="grid gap-3">
      <input type="hidden" name="studentId" value={studentId} />
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          formAction={submitPeriod("current")}
          variant={scope === "week" ? "primary" : "secondary"}
          disabled={pending && activePeriod === "current"}
          aria-busy={pending && activePeriod === "current" ? true : undefined}
        >
          {pending && activePeriod === "current"
            ? REPORT_MESSAGES.preparing
            : currentLabel}
        </Button>
        <Button
          type="submit"
          formAction={submitPeriod("previous")}
          variant="secondary"
          disabled={pending && activePeriod === "previous"}
          aria-busy={pending && activePeriod === "previous" ? true : undefined}
        >
          {pending && activePeriod === "previous"
            ? REPORT_MESSAGES.preparing
            : previousLabel}
        </Button>
      </div>
    </form>
  );
}

export function ReportDownloadForm({ studentId }: { studentId: string }) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-700">{REPORT_MESSAGES.downloadHint}</p>
      <PdfScopeForm
        studentId={studentId}
        scope="week"
        title="Haftalık PDF"
        currentLabel={REPORT_MESSAGES.downloadCurrent}
        previousLabel={REPORT_MESSAGES.downloadPrevious}
      />
      <PdfScopeForm
        studentId={studentId}
        scope="month"
        title="Aylık PDF"
        currentLabel={REPORT_MESSAGES.downloadMonthCurrent}
        previousLabel={REPORT_MESSAGES.downloadMonthPrevious}
      />
    </div>
  );
}
