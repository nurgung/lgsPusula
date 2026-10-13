import { AUTH_EMAIL_DOMAIN } from "../../src/features/auth/username.ts";
import { admin, E2E_USERNAME_PREFIX, isAuthConfigured } from "./support/auth.ts";

/** Removes fictional e2e accounts and rate-limit counters left over from earlier runs. */
export default async function globalSetup() {
  if (!isAuthConfigured()) {
    if (process.env.E2E_REQUIRE_AUTH === "1") {
      throw new Error(
        "E2E_REQUIRE_AUTH=1 but Supabase/auth environment variables are missing.",
      );
    }
    return;
  }

  const client = admin();
  const staleIds: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed (${error.code ?? "unknown"})`);
    for (const user of data.users) {
      if (
        user.email?.startsWith(E2E_USERNAME_PREFIX) &&
        user.email.endsWith(`@${AUTH_EMAIL_DOMAIN}`)
      ) {
        staleIds.push(user.id);
      }
    }
    if (data.users.length < 200) break;
  }
  for (const id of staleIds) {
    const { error } = await client.auth.admin.deleteUser(id);
    if (error) throw new Error(`deleteUser failed (${error.code ?? "unknown"})`);
  }

  const { error } = await client.from("auth_rate_limits").delete().neq("bucket_key", "");
  if (error) throw new Error(`clearing rate limits failed (${error.code})`);
}
