"use server";

import { reportMonitorEvent } from "@/services/monitoring/sentry";

/** Client errors may include typed text. Only Next's opaque digest is forwarded. */
export async function reportRouteError(digest: string): Promise<void> {
  await reportMonitorEvent({ digest });
}
