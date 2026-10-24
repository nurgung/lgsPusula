import { isAuthConfigured } from "./support/auth.ts";
import { deleteE2eCatalog } from "./support/catalog.ts";

/** Drops fictional catalog rows so the local student home does not keep test subjects. */
export default async function globalTeardown() {
  if (!isAuthConfigured()) return;
  await deleteE2eCatalog();
}
