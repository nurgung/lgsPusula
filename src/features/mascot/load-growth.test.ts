import { beforeEach, describe, expect, it, vi } from "vitest";
import { growthNoticeContent } from "./growth";

vi.mock("@/services/supabase/server-client", () => ({
  createSessionClient: vi.fn(async () => ({})),
}));

vi.mock("@/services/supabase/mascot-store", () => {
  class MascotStoreError extends Error {
    constructor(operation: string, code?: string) {
      super(`Mascot operation failed: ${operation}${code ? ` (${code})` : ""}`);
      this.name = "MascotStoreError";
    }
  }
  return {
    MascotStoreError,
    openGrowthNotice: vi.fn(),
  };
});

import { openGrowthNotices } from "./load-growth";
import { MascotStoreError, openGrowthNotice } from "@/services/supabase/mascot-store";

const plan = { kind: "mascot_sick" as const, noticeDate: "2026-10-23" };

describe("openGrowthNotices", () => {
  beforeEach(() => {
    vi.mocked(openGrowthNotice).mockReset();
  });

  it("returns no card when the function fails and keeps a server log", async () => {
    vi.mocked(openGrowthNotice).mockRejectedValue(
      new MascotStoreError("open_growth_notice", "42883"),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(openGrowthNotices([plan], "Yeni arkadaş")).resolves.toEqual([]);

    expect(spy).toHaveBeenCalledWith(
      "Mascot operation failed: open_growth_notice (42883)",
    );
    expect(spy.mock.calls.flat().join(" ")).not.toContain("Karakterin dinleniyor");
  });

  it("does not invent a notice when the function returns nothing", async () => {
    vi.mocked(openGrowthNotice).mockResolvedValue(null);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(openGrowthNotices([plan], "Yeni arkadaş")).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows only the stored row's own sentence", async () => {
    vi.mocked(openGrowthNotice).mockResolvedValue("11111111-1111-4111-8111-111111111111");
    const copy = growthNoticeContent(plan.kind, "Yeni arkadaş");

    await expect(openGrowthNotices([plan], "Yeni arkadaş")).resolves.toEqual([
      { id: "11111111-1111-4111-8111-111111111111", title: copy.title, body: copy.body },
    ]);
  });

  it("lets an unexpected error leave the page", async () => {
    vi.mocked(openGrowthNotice).mockRejectedValue(new Error("session missing"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(openGrowthNotices([plan], "Yeni arkadaş")).rejects.toThrow(
      "session missing",
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
