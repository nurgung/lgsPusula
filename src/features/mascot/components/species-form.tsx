"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary } from "@/components/ui/form-field";
import { StateMessage } from "@/components/ui/state-message";
import { saveSpeciesAction } from "../actions";
import { INITIAL_MASCOT_FORM_STATE } from "../form-state";
import { MASCOT_MESSAGES } from "../messages";
import { SPECIES, type SpeciesCode } from "../species";
import { SpeciesFigure } from "./species-figure";

export function SpeciesForm({ current }: { current: SpeciesCode | null }) {
  const [state, formAction, pending] = useActionState(
    saveSpeciesAction,
    INITIAL_MASCOT_FORM_STATE,
  );
  const legendId = useId();
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const selected = state.status === "error" ? state.values?.species : current;
  const speciesError = fieldErrors.species;

  return (
    <form action={formAction} className="grid min-w-0 gap-4" noValidate>
      {state.status === "error" && speciesError ? (
        <FormErrorSummary errors={[{ fieldId: legendId, message: speciesError }]} />
      ) : null}
      {state.status === "error" && !speciesError ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <fieldset
        className="grid min-w-0 gap-2"
        aria-describedby={speciesError ? legendId : undefined}
      >
        <legend id={legendId} className="font-semibold text-ink-900">
          Karakterin
        </legend>
        <p className="text-sm text-ink-600">{MASCOT_MESSAGES.changeSpeciesHint}</p>
        {speciesError ? (
          <p className="text-sm font-semibold text-danger-700">{speciesError}</p>
        ) : null}
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {SPECIES.map((species) => (
            <label
              key={species.code}
              className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-xl border-2 border-border bg-surface px-3 py-2 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="species"
                value={species.code}
                defaultChecked={selected === species.code}
                className="size-5 shrink-0"
                required
              />
              <SpeciesFigure code={species.code} />
              <span className="min-w-0">
                <span className="block font-semibold text-ink-900">{species.name}</span>
                <span className="block text-sm text-ink-600">
                  {species.kindLabel}. {species.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? "Kaydediliyor..." : "Karakteri kaydet"}
        </Button>
      </div>
    </form>
  );
}
