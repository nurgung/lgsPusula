import "server-only";
import { fetchCatalogRows } from "@/services/supabase/catalog-store";
import { createSessionClient } from "@/services/supabase/server-client";
import { buildCatalogTree, type CatalogSubject } from "./catalog";

/**
 * Reads the catalog as the signed-in user (RLS: any signed-in user may read). Students see
 * only rows that are not archived; the admin pages pass `includeArchived`.
 */
export async function loadCatalog({
  includeArchived,
}: {
  includeArchived: boolean;
}): Promise<CatalogSubject[]> {
  const session = await createSessionClient({ writable: false });
  const rows = await fetchCatalogRows(session);
  return buildCatalogTree(rows, { includeArchived });
}
