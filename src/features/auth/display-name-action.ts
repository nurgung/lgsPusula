"use server";

import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/services/supabase/server-client";
import {
  AUTH_MESSAGES,
  type DisplayNameFormState,
} from "./form-state";
import { fieldErrorsFrom, updateDisplayNameSchema } from "./schemas";
import { ACCOUNT_PATH, requireUser } from "./session";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function updateDisplayNameAction(
  _previous: DisplayNameFormState,
  formData: FormData,
): Promise<DisplayNameFormState> {
  const user = await requireUser();
  const raw = text(formData, "displayName");
  const parsed = updateDisplayNameSchema.safeParse({ displayName: raw });
  if (!parsed.success) {
    return {
      status: "error",
      message: AUTH_MESSAGES.formInvalid,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { displayName: raw },
    };
  }

  const session = await createSessionClient({ writable: true });
  const { data, error } = await session
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", user.id)
    .select("display_name")
    .maybeSingle();

  if (error || !data) {
    console.error(error?.message ?? "display_name update returned no row");
    return {
      status: "error",
      message: AUTH_MESSAGES.displayNameFailed,
      values: { displayName: parsed.data.displayName },
    };
  }

  revalidatePath(ACCOUNT_PATH);
  revalidatePath("/ogrenci");
  revalidatePath("/veli");
  return { status: "saved", displayName: data.display_name };
}
