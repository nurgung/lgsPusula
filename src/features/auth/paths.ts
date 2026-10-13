import type { UserRole } from "@/types/roles";

export const LOGIN_PATH = "/giris";
export const ACCOUNT_PATH = "/hesap";
export const CHANGE_PASSWORD_PATH = "/parola-degistir";
export const STUDENT_HOME_PATH = "/ogrenci";
export const PARENT_HOME_PATH = "/veli";
export const ADMIN_HOME_PATH = "/yonetici";
export const MFA_PATH = "/mfa";

export function landingPathFor(user: {
  mustChangePassword: boolean;
  roles: readonly UserRole[];
}): string {
  if (user.mustChangePassword) return CHANGE_PASSWORD_PATH;
  if (user.roles.includes("student")) return STUDENT_HOME_PATH;
  if (user.roles.includes("parent")) return PARENT_HOME_PATH;
  return ACCOUNT_PATH;
}

export function homePathFor(roles: readonly UserRole[]): string {
  return landingPathFor({ mustChangePassword: false, roles });
}
