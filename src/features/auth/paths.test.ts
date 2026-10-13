import { describe, expect, it } from "vitest";
import { homePathFor, landingPathFor } from "./paths";

describe("landingPathFor", () => {
  it("sends a temporary password to the change page before any role home", () => {
    expect(landingPathFor({ mustChangePassword: true, roles: ["student"] })).toBe(
      "/parola-degistir",
    );
  });

  it("sends each role to its own home", () => {
    expect(landingPathFor({ mustChangePassword: false, roles: ["student"] })).toBe(
      "/ogrenci",
    );
    expect(landingPathFor({ mustChangePassword: false, roles: ["parent"] })).toBe(
      "/veli",
    );
    expect(
      landingPathFor({ mustChangePassword: false, roles: ["parent", "admin"] }),
    ).toBe("/veli");
  });

  it("uses the same home for the shell", () => {
    expect(homePathFor(["student"])).toBe("/ogrenci");
    expect(homePathFor(["admin", "parent"])).toBe("/veli");
  });
});
