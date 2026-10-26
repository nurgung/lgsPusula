import { isAuthConfigured } from "./support/auth.ts";
import { deleteE2eCatalog } from "./support/catalog.ts";

/** Sweeps fictional catalog rows left behind when a test is interrupted. */
export default async function globalTeardown() {
  if (!isAuthConfigured()) return;
  await deleteE2eCatalog();
}
