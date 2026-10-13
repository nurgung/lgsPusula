import { describe, expect, it } from "vitest";
import { withAuthCookieOptions } from "./cookie-options";

describe("withAuthCookieOptions", () => {
  it("forces Secure, HttpOnly and SameSite=Lax on every auth cookie", () => {
    expect(
      withAuthCookieOptions({ httpOnly: false, secure: false, sameSite: "none" }),
    ).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("keeps the lifetime chosen by the auth library (including deletion)", () => {
    expect(withAuthCookieOptions({ maxAge: 0 })).toMatchObject({
      maxAge: 0,
      httpOnly: true,
    });
    expect(withAuthCookieOptions(undefined)).toMatchObject({ secure: true });
  });
});
