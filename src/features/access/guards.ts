import "server-only";
import { notFound, redirect } from "next/navigation";
import { MFA_PATH } from "@/features/auth/paths";
import { requireUser, type CurrentUser } from "@/features/auth/session";

/** Student accounts carry no other role (decision 0.13). */
export async function requireStudent(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!(user.roles.length === 1 && user.roles[0] === "student")) notFound();
  return user;
}

export async function requireParent(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.roles.includes("parent")) notFound();
  return user;
}

/**
 * Admin pages need both the admin role and a TOTP-verified session.
 * A parent+admin account that has not completed MFA keeps using parent pages.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.roles.includes("admin")) notFound();
  if (user.assuranceLevel !== "aal2") redirect(MFA_PATH);
  return user;
}
