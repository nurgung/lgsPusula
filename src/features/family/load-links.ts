import "server-only";
import { AuthProviderError } from "@/services/supabase/auth-adapters";
import {
  expireStaleFamilyLinks,
  listVisibleFamilyLinks,
} from "@/services/supabase/family-store";
import {
  createServiceClient,
  createSessionClient,
} from "@/services/supabase/server-client";
import type { VisibleFamilyLink } from "./schemas";

/** Expires stale requests, then reads links as the signed-in user (RLS). */
export async function loadOwnFamilyLinks(): Promise<VisibleFamilyLink[]> {
  const service = createServiceClient();
  await expireStaleFamilyLinks(service);
  const session = await createSessionClient({ writable: false });
  try {
    return await listVisibleFamilyLinks(session);
  } catch (error) {
    if (error instanceof AuthProviderError) throw error;
    throw new AuthProviderError("visible_family_links");
  }
}
