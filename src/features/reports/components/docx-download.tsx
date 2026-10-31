"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { requestWeeklyDocxAction, type DocxFormState } from "../docx-action";
import type { ReportScope } from "../periods";

const INITIAL: DocxFormState = { status: "idle" };

type PeriodChoice = "current" | "previous";

function saveFile(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DocxScopeForm({
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
  const [state, action, pending] = useActionState(requestWeeklyDocxAction, INITIAL);
  const [activePeriod, setActivePeriod] = useState<PeriodChoice | null>(null);

  useEffect(() => {
    if (state.status === "file") saveFile(state.base64, state.filename);
  }, [state]);

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
          variant="secondary"
          disabled={pending && activePeriod === "current"}
          aria-busy={pending && activePeriod === "current" ? true : undefined}
        >
          {pending && activePeriod === "current" ? "Hazırlanıyor..." : currentLabel}
        </Button>
        <Button
          type="submit"
          formAction={submitPeriod("previous")}
          variant="secondary"
          disabled={pending && activePeriod === "previous"}
          aria-busy={pending && activePeriod === "previous" ? true : undefined}
        >
          {pending && activePeriod === "previous" ? "Hazırlanıyor..." : previousLabel}
        </Button>
      </div>
    </form>
  );
}

export function DocxDownload({ studentId }: { studentId: string }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-700">
        Word dosyası PDF ile aynı akademik özeti kullanır. Dosya tarayıcıya iner ve
        sunucuda saklanmaz.
      </p>
      <DocxScopeForm
        studentId={studentId}
        scope="week"
        title="Haftalık Word"
        currentLabel="Bu haftayı Word olarak indir"
        previousLabel="Geçen haftayı Word olarak indir"
      />
      <DocxScopeForm
        studentId={studentId}
        scope="month"
        title="Aylık Word"
        currentLabel="Bu ayı Word olarak indir"
        previousLabel="Geçen ayı Word olarak indir"
      />
    </div>
  );
}
