import "server-only";
import { getServerEnv, type ServerEnv } from "@/lib/env/server";

/**
 * Feature flag for UI drafts that contain only fictional sample data.
 * This is NOT access control: preview pages must never read real records.
 */
export function isUiPreviewEnabled(
  env: Pick<ServerEnv, "UI_PREVIEW_ENABLED" | "APP_ENV"> = getServerEnv(),
) {
  return env.UI_PREVIEW_ENABLED && env.APP_ENV !== "production";
}
