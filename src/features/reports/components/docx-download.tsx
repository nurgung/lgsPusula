"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { requestWeeklyDocxAction, type DocxFormState } from "../docx-action";

const INITIAL: DocxFormState = { status: "idle" };

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

export function DocxDownload({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState(requestWeeklyDocxAction, INITIAL);

  useEffect(() => {
    if (state.status === "file") saveFile(state.base64, state.filename);
  }, [state]);

  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-700">
        Word dosyası PDF ile aynı akademik özeti kullanır. Dosya tarayıcıya iner ve
        sunucuda saklanmaz.
      </p>
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <form action={action} className="grid gap-3">
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="scope" value="week" />
        <p className="text-sm font-semibold text-ink-900">Haftalık Word</p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            name="period"
            value="current"
            variant="secondary"
            disabled={pending}
          >
            {pending ? "Hazırlanıyor..." : "Bu haftayı Word olarak indir"}
          </Button>
          <Button
            type="submit"
            name="period"
            value="previous"
            variant="secondary"
            disabled={pending}
          >
            {pending ? "Hazırlanıyor..." : "Geçen haftayı Word olarak indir"}
          </Button>
        </div>
      </form>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="scope" value="month" />
        <p className="text-sm font-semibold text-ink-900">Aylık Word</p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            name="period"
            value="current"
            variant="secondary"
            disabled={pending}
          >
            {pending ? "Hazırlanıyor..." : "Bu ayı Word olarak indir"}
          </Button>
          <Button
            type="submit"
            name="period"
            value="previous"
            variant="secondary"
            disabled={pending}
          >
            {pending ? "Hazırlanıyor..." : "Geçen ayı Word olarak indir"}
          </Button>
        </div>
      </form>
    </div>
  );
}
