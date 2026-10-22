import { buildMonitorPayload, payloadHasBlockedFields, type MonitorEvent } from "./scrub";

const DSN_PATTERN =
  /^https:\/\/([A-Za-z0-9]+)@(o[0-9]+\.ingest\.de\.sentry\.io)\/([0-9]+)$/;

export type DeliveryResult = "disabled" | "sent" | "dropped";

type DeliverOptions = {
  dsn: string | undefined;
  event: MonitorEvent;
  fetchImpl?: typeof fetch;
};

/**
 * Posts one scrubbed event to Sentry's EU ingest. No user, IP, cookie or request body.
 * A missing DSN disables reporting. Any other host is refused.
 */
export async function deliverMonitorEvent({
  dsn,
  event,
  fetchImpl = fetch,
}: DeliverOptions): Promise<DeliveryResult> {
  if (!dsn) return "disabled";
  const match = DSN_PATTERN.exec(dsn);
  const payload = buildMonitorPayload(event);
  if (!match || !payload || payloadHasBlockedFields(payload)) return "dropped";
  const key = match[1];
  const host = match[2];
  const projectId = match[3];
  if (!key || !host || !projectId) return "dropped";

  const eventId = crypto.randomUUID().replaceAll("-", "");
  const envelope = [
    JSON.stringify({ event_id: eventId, dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({
      event_id: eventId,
      platform: "node",
      message: payload.message,
      level: "error",
    }),
  ].join("\n");

  try {
    const response = await fetchImpl(`https://${host}/api/${projectId}/envelope/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=lgs-pusula/0.1`,
      },
      body: envelope,
      signal: AbortSignal.timeout(3_000),
    });
    return response.ok ? "sent" : "dropped";
  } catch {
    return "dropped";
  }
}
