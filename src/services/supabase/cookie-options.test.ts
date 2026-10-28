import { describe, expect, it } from "vitest";
import { parseCookieHeader, withAuthCookieOptions } from "./cookie-options";

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

describe("parseCookieHeader", () => {
  it("returns an empty list when the header is missing", () => {
    expect(parseCookieHeader(null)).toEqual([]);
    expect(parseCookieHeader("")).toEqual([]);
  });

  it("keeps values that contain equals signs", () => {
    expect(parseCookieHeader("a=1; b=c=d; e=f")).toEqual([
      { name: "a", value: "1" },
      { name: "b", value: "c=d" },
      { name: "e", value: "f" },
    ]);
  });
});
