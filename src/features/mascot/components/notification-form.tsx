"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, SelectField, TextField } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { saveNotificationPreferencesAction } from "../actions";
import { INITIAL_MASCOT_FORM_STATE } from "../form-state";
import { MASCOT_MESSAGES } from "../messages";

export function NotificationForm({
  enabled,
  quietStart,
  quietEnd,
  maxPerDay,
}: {
  enabled: boolean;
  quietStart: string;
  quietEnd: string;
  maxPerDay: number;
}) {
  const [state, formAction, pending] = useActionState(
    saveNotificationPreferencesAction,
    INITIAL_MASCOT_FORM_STATE,
  );
  const prefix = useId();
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? state.values : undefined;
  const fields = [
    ["enabled", `${prefix}-enabled`],
    ["quietStart", `${prefix}-quietStart`],
    ["quietEnd", `${prefix}-quietEnd`],
    ["maxPerDay", `${prefix}-maxPerDay`],
  ] as const;
  const errors = fields.flatMap(([name, fieldId]) => {
    const message = fieldErrors[name];
    return message ? [{ fieldId, message }] : [];
  });

  return (
    <form action={formAction} className="grid min-w-0 gap-4" noValidate>
      {state.status === "error" && errors.length > 0 ? (
        <FormErrorSummary errors={errors} />
      ) : null}
      {state.status === "error" && errors.length === 0 ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <p className="text-sm text-ink-600">{MASCOT_MESSAGES.notificationsHint}</p>
      <SelectField
        id={`${prefix}-enabled`}
        name="enabled"
        label="Hatırlatmalar"
        hint="Kapalıyken çalışma hatırlatması gösterilmez."
        options={[
          { value: "acik", label: "Açık" },
          { value: "kapali", label: "Kapalı" },
        ]}
        defaultValue={values?.enabled ?? (enabled ? "acik" : "kapali")}
        error={fieldErrors.enabled}
      />
      <TextField
        id={`${prefix}-quietStart`}
        name="quietStart"
        type="time"
        label="Sessiz saat başlangıcı"
        hint="Bu saatten sonra hatırlatma çıkmaz. İki saati aynı yazarsan sessiz saat kapanır."
        defaultValue={values?.quietStart ?? quietStart}
        error={fieldErrors.quietStart}
      />
      <TextField
        id={`${prefix}-quietEnd`}
        name="quietEnd"
        type="time"
        label="Sessiz saat bitişi"
        hint="Türkiye saatiyle (İstanbul). Bu saatten sonra hatırlatma yine görünebilir."
        defaultValue={values?.quietEnd ?? quietEnd}
        error={fieldErrors.quietEnd}
      />
      <SelectField
        id={`${prefix}-maxPerDay`}
        name="maxPerDay"
        label="Günde en fazla"
        hint="Aynı gün bu sayıdan fazla yeni hatırlatma açılmaz."
        options={[
          { value: "1", label: "1 hatırlatma" },
          { value: "2", label: "2 hatırlatma" },
          { value: "3", label: "3 hatırlatma" },
        ]}
        defaultValue={values?.maxPerDay ?? String(maxPerDay)}
        error={fieldErrors.maxPerDay}
      />
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? "Kaydediliyor..." : "Ayarları kaydet"}
        </Button>
      </div>
    </form>
  );
}
