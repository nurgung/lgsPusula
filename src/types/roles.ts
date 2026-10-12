export const USER_ROLES = ["student", "parent", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Öğrenci",
  parent: "Veli",
  admin: "Yönetici",
};
