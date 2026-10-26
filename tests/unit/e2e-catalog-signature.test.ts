// @vitest-environment node
import { describe, expect, it } from "vitest";
import { AUTH_EMAIL_DOMAIN } from "@/features/auth/username";
import {
  matchesE2eAccountEmail,
  matchesE2eCatalogSubject,
} from "../e2e/support/catalog-signature.ts";

const fictional = {
  code: "e2e_e2d1dee7",
  source_name: "Kurgusal test kaynağı",
  source_version: "e2e",
};

describe("matchesE2eCatalogSubject", () => {
  it("accepts the fictional fixture signature", () => {
    expect(matchesE2eCatalogSubject(fictional)).toBe(true);
  });

  it("rejects the real curriculum and partial prefixes", () => {
    expect(
      matchesE2eCatalogSubject({
        code: "turkce",
        source_name: "MEB",
        source_version: "2026-2027",
      }),
    ).toBe(false);
    expect(matchesE2eCatalogSubject({ ...fictional, source_version: "2026-2027" })).toBe(
      false,
    );
    expect(matchesE2eCatalogSubject({ ...fictional, source_name: "MEB" })).toBe(false);
    expect(matchesE2eCatalogSubject({ ...fictional, code: "turkce" })).toBe(false);
    expect(matchesE2eCatalogSubject({ ...fictional, code: "xe2e_ders" })).toBe(false);
    expect(matchesE2eCatalogSubject({ ...fictional, code: "E2E_ders" })).toBe(false);
  });
});

describe("matchesE2eAccountEmail", () => {
  it("accepts only a fictional local account", () => {
    expect(matchesE2eAccountEmail(`e2e_abc123@${AUTH_EMAIL_DOMAIN}`, AUTH_EMAIL_DOMAIN)).toBe(
      true,
    );
    expect(matchesE2eAccountEmail(`ogrenci@${AUTH_EMAIL_DOMAIN}`, AUTH_EMAIL_DOMAIN)).toBe(
      false,
    );
    expect(matchesE2eAccountEmail("e2e_abc123@example.com", AUTH_EMAIL_DOMAIN)).toBe(false);
    expect(matchesE2eAccountEmail(`e2e_@${AUTH_EMAIL_DOMAIN}`, AUTH_EMAIL_DOMAIN)).toBe(false);
    expect(matchesE2eAccountEmail(undefined, AUTH_EMAIL_DOMAIN)).toBe(false);
  });
});
