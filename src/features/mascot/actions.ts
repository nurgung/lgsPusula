"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStudent } from "@/features/access/guards";
import { fieldErrorsFrom } from "@/features/auth/schemas";
import { createSessionClient } from "@/services/supabase/server-client";
import {
  dismissStudyReminder,
  MascotStoreError,
  saveMascotSpecies,
  saveNotificationPreferences,
} from "@/services/supabase/mascot-store";
import type { MascotFormState } from "./form-state";
import { MASCOT_MESSAGES } from "./messages";
import { clockForDatabase, notificationPreferencesSchema, speciesSchema } from "./schemas";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function valuesOf(formData: FormData, names: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of names) values[name] = text(formData, name);
  return values;
}

function providerError(error: unknown, values?: Record<string, string>): MascotFormState {
  if (!(error instanceof MascotStoreError)) throw error;
  console.error(error.message);
  return { status: "error", message: MASCOT_MESSAGES.providerError, values };
}

export async function saveSpeciesAction(
  _previous: MascotFormState,
  formData: FormData,
): Promise<MascotFormState> {
  const user = await requireStudent();
  const values = valuesOf(formData, ["species"]);
  const parsed = speciesSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: MASCOT_MESSAGES.formInvalid,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  try {
    const session = await createSessionClient({ writable: true });
    await saveMascotSpecies(session, user.id, parsed.data.species);
  } catch (error) {
    return providerError(error, values);
  }

  refresh();
  redirect("/ogrenci/karakter?durum=kaydedildi");
}

const PREFERENCE_FIELDS = ["enabled", "quietStart", "quietEnd", "maxPerDay"] as const;

export async function saveNotificationPreferencesAction(
  _previous: MascotFormState,
  formData: FormData,
): Promise<MascotFormState> {
  const user = await requireStudent();
  const values = valuesOf(formData, PREFERENCE_FIELDS);
  const parsed = notificationPreferencesSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: MASCOT_MESSAGES.formInvalid,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  try {
    const session = await createSessionClient({ writable: true });
    await saveNotificationPreferences(session, user.id, {
      enabled: parsed.data.enabled === "acik",
      quietStart: clockForDatabase(parsed.data.quietStart),
      quietEnd: clockForDatabase(parsed.data.quietEnd),
      maxPerDay: Number(parsed.data.maxPerDay),
    });
  } catch (error) {
    return providerError(error, values);
  }

  refresh();
  redirect("/ogrenci/bildirimler?durum=kaydedildi");
}

export async function dismissReminderAction(formData: FormData): Promise<void> {
  const user = await requireStudent();
  const noticeId = z.uuid().safeParse(text(formData, "noticeId"));
  if (noticeId.success) {
    try {
      const session = await createSessionClient({ writable: true });
      await dismissStudyReminder(session, user.id, noticeId.data);
    } catch (error) {
      if (!(error instanceof MascotStoreError)) throw error;
      console.error(error.message);
    }
  }
  refresh();
  redirect("/ogrenci");
}
