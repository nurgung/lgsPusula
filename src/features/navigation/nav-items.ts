import type { NavItem } from "@/lib/navigation";
import type { UserRole } from "@/types/roles";

/**
 * Menu entries per role. A menu only decides what is SHOWN; every page and server action
 * must still check the session and resource access on the server (AUTHORIZATION.md).
 * The routes are created in Phase 4 and later.
 */
const ROLE_NAV_ITEMS: Record<UserRole, readonly NavItem[]> = {
  student: [
    { href: "/ogrenci", label: "Ana sayfa" },
    { href: "/ogrenci/calisma", label: "Çalışma" },
    { href: "/ogrenci/denemeler", label: "Denemeler" },
  ],
  parent: [
    { href: "/veli", label: "Özet" },
    { href: "/veli/raporlar", label: "Raporlar" },
  ],
  admin: [{ href: "/yonetici", label: "Yönetim" }],
};

const SHARED_NAV_ITEMS: readonly NavItem[] = [{ href: "/ayarlar", label: "Ayarlar" }];

const ROLE_ORDER: readonly UserRole[] = ["student", "parent", "admin"];

/** The mobile bottom bar fits five 64 px targets at a 320 px viewport width. */
export const MAX_NAV_ITEMS = 5;

export function getNavItems(roles: readonly UserRole[]): NavItem[] {
  if (roles.length === 0) return [];
  const items = [
    ...ROLE_ORDER.filter((role) => roles.includes(role)).flatMap(
      (role) => ROLE_NAV_ITEMS[role],
    ),
    ...SHARED_NAV_ITEMS,
  ];
  const unique = items.filter(
    (item, index) => items.findIndex((other) => other.href === item.href) === index,
  );
  if (unique.length > MAX_NAV_ITEMS) {
    throw new Error(
      `Navigation has ${unique.length} items; at most ${MAX_NAV_ITEMS} fit.`,
    );
  }
  return unique;
}
