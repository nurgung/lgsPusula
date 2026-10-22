import "server-only";
import { getServerEnv } from "@/lib/env/server";
import { deliverMonitorEvent, type DeliveryResult } from "./deliver";
import type { MonitorEvent } from "./scrub";

export async function reportMonitorEvent(event: MonitorEvent): Promise<DeliveryResult> {
  return deliverMonitorEvent({ dsn: getServerEnv().SENTRY_DSN, event });
}
