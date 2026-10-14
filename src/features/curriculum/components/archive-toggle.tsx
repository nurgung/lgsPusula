"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { setArchivedAction } from "../actions";
import { INITIAL_CATALOG_FORM_STATE } from "../form-state";
import type { CatalogEntity } from "../schemas";

/** Archiving is reversible and keeps the row, so no confirmation dialog is needed. */
export function ArchiveToggle({
  entity,
  id,
  archived,
  itemLabel,
}: {
  entity: CatalogEntity;
  id: string;
  archived: boolean;
  /** Read by screen readers after the button text, e.g. the topic name. */
  itemLabel: string;
}) {
  const [state, action, pending] = useActionState(
    setArchivedAction,
    INITIAL_CATALOG_FORM_STATE,
  );
  const label = archived ? "Yeniden kullanıma aç" : "Eski sürüm yap";

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="archived" value={archived ? "false" : "true"} />
      {state.status === "success" ? (
        <StateMessage variant="success" title={state.message} />
      ) : null}
      {state.status === "error" ? (
        <StateMessage variant="error" title={state.message} />
      ) : null}
      <div>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          aria-busy={pending || undefined}
          aria-label={`${label}: ${itemLabel}`}
        >
          {pending ? "Kaydediliyor..." : label}
        </Button>
      </div>
    </form>
  );
}
