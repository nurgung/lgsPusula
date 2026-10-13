import type { AuditEvent, AuditLog, RateLimitPolicy, RateLimiter } from "../ports";

/** In-memory fixed-window limiter with the same semantics as `consume_rate_limit`. */
export class FakeRateLimiter implements RateLimiter {
  readonly counts = new Map<string, number>();
  readonly resets: string[] = [];

  async consume(bucketKey: string, policy: RateLimitPolicy) {
    const count = (this.counts.get(bucketKey) ?? 0) + 1;
    this.counts.set(bucketKey, count);
    const allowed = count <= policy.maxAttempts;
    return { allowed, retryAfterSeconds: allowed ? 0 : policy.windowSeconds };
  }

  async reset(bucketKey: string) {
    this.counts.delete(bucketKey);
    this.resets.push(bucketKey);
  }
}

export class FakeAuditLog implements AuditLog {
  readonly events: AuditEvent[] = [];

  async record(event: AuditEvent) {
    this.events.push(event);
  }
}
