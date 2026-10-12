import type { NavItem } from "@/lib/navigation";

/** Menu for the sample-data drafts. Real role menus come from `getNavItems`. */
export const PREVIEW_NAV_ITEMS: readonly NavItem[] = [
  { href: "/onizleme/ogrenci", label: "Öğrenci" },
  { href: "/onizleme/veli", label: "Veli" },
  { href: "/onizleme/yonetici", label: "Yönetici" },
  { href: "/onizleme/bilesenler", label: "Bileşenler" },
  { href: "/onizleme/durumlar", label: "Durumlar" },
];
