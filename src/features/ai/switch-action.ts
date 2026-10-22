"use server";

import { requireStudent } from "@/features/access/guards";
import { AiStoreError, setOwnAiEnabled } from "@/services/supabase/ai-store";
import { createSessionClient } from "@/services/supabase/server-client";

export type AiSwitchState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved"; enabled: boolean };

export async function setAiEnabledAction(
  _previous: AiSwitchState,
  formData: FormData,
): Promise<AiSwitchState> {
  await requireStudent();
  const value = formData.get("enabled");
  if (value !== "true" && value !== "false") {
    return {
      status: "error",
      message: "Seçim anlaşılmadı. Sayfayı yenileyip tekrar dene.",
    };
  }
  const enabled = value === "true";
  try {
    const session = await createSessionClient({ writable: true });
    await setOwnAiEnabled(session, enabled);
    return { status: "saved", enabled };
  } catch (error) {
    if (error instanceof AiStoreError) {
      console.error(error.message);
      return {
        status: "error",
        message: "Ayar şu an kaydedilemedi. Biraz sonra tekrar dene.",
      };
    }
    throw error;
  }
}
