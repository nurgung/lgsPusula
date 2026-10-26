/** Fictional subjects use this code prefix together with the source pair below. */
export const E2E_SUBJECT_PREFIX = "e2e_";

/** Source name written by the e2e catalog fixture. Real curriculum rows do not use it. */
export const E2E_SOURCE_NAME = "Kurgusal test kaynağı";

/** Source version written by the e2e catalog fixture. */
export const E2E_SOURCE_VERSION = "e2e";

/** Local-part prefix of fictional accounts. `auth.ts` re-exports this as `E2E_USERNAME_PREFIX`. */
export const E2E_ACCOUNT_PREFIX = "e2e_";

export type E2eCatalogSignature = {
  code: string;
  source_name: string;
  source_version: string;
};

/** All three fields are required. A code prefix alone is not enough. */
export function matchesE2eCatalogSubject(row: E2eCatalogSignature): boolean {
  return (
    row.code.startsWith(E2E_SUBJECT_PREFIX) &&
    row.source_name === E2E_SOURCE_NAME &&
    row.source_version === E2E_SOURCE_VERSION
  );
}

/**
 * E2E accounts are `e2e_…@<auth domain>`. A blank local part does not count.
 * Catalog cleanup may remove rows owned by these accounts and must stop for any other account.
 */
export function matchesE2eAccountEmail(
  email: string | undefined,
  domain: string,
): boolean {
  if (!email || !domain) return false;
  const suffix = `@${domain}`;
  if (!email.startsWith(E2E_ACCOUNT_PREFIX) || !email.endsWith(suffix)) return false;
  return email.length > E2E_ACCOUNT_PREFIX.length + suffix.length;
}
