"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import type { z } from "zod";
import { createAuditLog } from "@/services/supabase/auth-adapters";
import {
  CatalogStoreError,
  insertOutcome,
  insertSubject,
  insertTopic,
  setArchived,
  updateOutcome,
  updateSubject,
  updateTopic,
} from "@/services/supabase/catalog-store";
import {
  createServiceClient,
  createSessionClient,
} from "@/services/supabase/server-client";
import { fieldErrorsFrom } from "@/features/auth/schemas";
import { requireUser } from "@/features/auth/session";
import {
  CATALOG_MESSAGES,
  canChangeCatalog,
  runCatalogChange,
  type CatalogAction,
  type CatalogWriteResult,
} from "./catalog-change";
import type { CatalogFormState } from "./form-state";
import {
  CATALOG_ENTITIES,
  archiveSchema,
  outcomeCreateSchema,
  outcomeUpdateSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
  topicCreateSchema,
  topicUpdateSchema,
  type CatalogEntity,
} from "./schemas";

const FORM_FIELDS = [
  "id",
  "subjectId",
  "topicId",
  "code",
  "name",
  "description",
  "sortOrder",
  "sourceName",
  "sourceVersion",
  "entity",
  "archived",
] as const;

function readForm(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of FORM_FIELDS) {
    const value = formData.get(name);
    if (typeof value === "string") values[name] = value.slice(0, 600);
  }
  return values;
}

type Target = { entity: CatalogEntity; action: CatalogAction };

async function submit<T>(
  formData: FormData,
  schema: z.ZodType<T>,
  target: (values: Record<string, string>) => Target,
  write: (session: SupabaseClient, input: T) => Promise<CatalogWriteResult>,
): Promise<CatalogFormState> {
  const user = await requireUser();
  const audit = createAuditLog(createServiceClient());
  const values = readForm(formData);
  const { entity, action } = target(values);

  // Check the caller before looking at the input, so a refusal does not reveal validation rules.
  if (!canChangeCatalog(user)) {
    return runCatalogChange(
      { user, entity, action, write: async () => "denied" },
      { audit },
    );
  }

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: CATALOG_MESSAGES.formInvalid,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  try {
    const session = await createSessionClient({ writable: true });
    const state = await runCatalogChange(
      { user, entity, action, write: () => write(session, parsed.data) },
      { audit },
    );
    if (state.status === "error") return { ...state, values };
    refresh();
    return state;
  } catch (error) {
    if (!(error instanceof CatalogStoreError)) throw error;
    console.error(error.message);
    return { status: "error", message: CATALOG_MESSAGES.providerError, values };
  }
}

export async function createSubjectAction(
  _previous: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  return submit(
    formData,
    subjectCreateSchema,
    () => ({ entity: "subject", action: "create" }),
    insertSubject,
  );
}

export async function updateSubjectAction(
  _previous: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  return submit(
    formData,
    subjectUpdateSchema,
    () => ({ entity: "subject", action: "update" }),
    updateSubject,
  );
}

export async function createTopicAction(
  _previous: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  return submit(
    formData,
    topicCreateSchema,
    () => ({ entity: "topic", action: "create" }),
    insertTopic,
  );
}

export async function updateTopicAction(
  _previous: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  return submit(
    formData,
    topicUpdateSchema,
    () => ({ entity: "topic", action: "update" }),
    updateTopic,
  );
}

export async function createOutcomeAction(
  _previous: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  return submit(
    formData,
    outcomeCreateSchema,
    () => ({ entity: "learning_outcome", action: "create" }),
    insertOutcome,
  );
}

export async function updateOutcomeAction(
  _previous: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  return submit(
    formData,
    outcomeUpdateSchema,
    () => ({ entity: "learning_outcome", action: "update" }),
    updateOutcome,
  );
}

export async function setArchivedAction(
  _previous: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  return submit(
    formData,
    archiveSchema,
    (values) => ({
      entity: CATALOG_ENTITIES.find((entity) => entity === values.entity) ?? "subject",
      action: values.archived === "true" ? "archive" : "restore",
    }),
    (session, input) => setArchived(session, input.entity, input.id, input.archived),
  );
}
