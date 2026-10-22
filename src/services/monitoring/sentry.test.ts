// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { deliverMonitorEvent } from "./deliver";

const DSN = "https://abc123key@o99.ingest.de.sentry.io/456";

describe("deliverMonitorEvent", () => {
  it("does nothing when monitoring is not configured", async () => {
    const fetchImpl = vi.fn();
    const result = await deliverMonitorEvent({
      dsn: undefined,
      event: { digest: "abc" },
      fetchImpl,
    });
    expect(result).toBe("disabled");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses a DSN that is not the EU ingest host", async () => {
    const fetchImpl = vi.fn();
    const result = await deliverMonitorEvent({
      dsn: "https://abc123key@evil.example/456",
      event: { digest: "abc" },
      fetchImpl,
    });
    expect(result).toBe("dropped");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends only the scrubbed message", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    const result = await deliverMonitorEvent({
      dsn: DSN,
      event: { digest: "route1", message: "password=gizli ada@okul.example" },
      fetchImpl,
    });
    expect(result).toBe("sent");
    const init = fetchImpl.mock.calls[0]?.[1];
    const body = String(init?.body ?? "");
    expect(body).not.toContain("gizli");
    expect(body).not.toContain("ada@okul.example");
    expect(body).not.toContain('"user"');
    expect(body).not.toContain("cookie");
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://o99.ingest.de.sentry.io/api/456/envelope/",
    );
  });
});
