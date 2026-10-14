import { describe, expect, it, vi } from "vitest";
import { FakeAuditLog } from "@/features/auth/testing/fakes";
import { CATALOG_MESSAGES, canChangeCatalog, runCatalogChange } from "./catalog-change";

const admin = {
  id: "admin-1",
  roles: ["parent", "admin"] as const,
  assuranceLevel: "aal2" as const,
};

describe("canChangeCatalog", () => {
  it("allows only an admin whose session completed TOTP", () => {
    expect(canChangeCatalog({ roles: ["parent", "admin"], assuranceLevel: "aal2" })).toBe(
      true,
    );
    expect(canChangeCatalog({ roles: ["parent", "admin"], assuranceLevel: "aal1" })).toBe(
      false,
    );
    expect(canChangeCatalog({ roles: ["parent"], assuranceLevel: "aal2" })).toBe(false);
    expect(canChangeCatalog({ roles: ["student"], assuranceLevel: "aal2" })).toBe(false);
  });
});

describe("runCatalogChange", () => {
  it.each([
    { roles: ["student"] as const, assuranceLevel: "aal1" as const },
    { roles: ["parent"] as const, assuranceLevel: "aal1" as const },
    { roles: ["parent", "admin"] as const, assuranceLevel: "aal1" as const },
  ])("does not write for $roles at $assuranceLevel", async (user) => {
    const audit = new FakeAuditLog();
    const write = vi.fn(async () => "ok" as const);
    const state = await runCatalogChange(
      { user: { id: "user-1", ...user }, entity: "topic", action: "create", write },
      { audit },
    );
    expect(write).not.toHaveBeenCalled();
    expect(state).toEqual({ status: "error", message: CATALOG_MESSAGES.notAllowed });
    expect(audit.events).toEqual([
      {
        type: "admin.catalog_change",
        outcome: "blocked",
        actorId: "user-1",
        metadata: {
          catalogEntity: "topic",
          catalogAction: "create",
          reason: "not_allowed",
        },
      },
    ]);
  });

  it("writes and records success for an admin with TOTP", async () => {
    const audit = new FakeAuditLog();
    const state = await runCatalogChange(
      {
        user: admin,
        entity: "learning_outcome",
        action: "archive",
        write: async () => "ok",
      },
      { audit },
    );
    expect(state).toEqual({ status: "success", message: CATALOG_MESSAGES.archived });
    expect(audit.events[0]).toMatchObject({
      outcome: "success",
      metadata: { catalogEntity: "learning_outcome", catalogAction: "archive" },
    });
  });

  it("explains a duplicate per entity", async () => {
    const audit = new FakeAuditLog();
    const state = await runCatalogChange(
      {
        user: admin,
        entity: "subject",
        action: "create",
        write: async () => "duplicate",
      },
      { audit },
    );
    expect(state).toEqual({
      status: "error",
      message: CATALOG_MESSAGES.duplicate.subject,
    });
    expect(audit.events[0]).toMatchObject({
      outcome: "failure",
      metadata: { reason: "duplicate" },
    });
  });

  it("treats a database refusal as blocked even when the app allowed it", async () => {
    const audit = new FakeAuditLog();
    const state = await runCatalogChange(
      { user: admin, entity: "topic", action: "update", write: async () => "denied" },
      { audit },
    );
    expect(state).toEqual({ status: "error", message: CATALOG_MESSAGES.notAllowed });
    expect(audit.events[0]).toMatchObject({ outcome: "blocked" });
  });

  it("reports a missing row without saying whether it exists", async () => {
    const state = await runCatalogChange(
      { user: admin, entity: "topic", action: "update", write: async () => "not_found" },
      { audit: new FakeAuditLog() },
    );
    expect(state).toEqual({ status: "error", message: CATALOG_MESSAGES.notFound });
  });
});
