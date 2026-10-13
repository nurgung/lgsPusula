import type { NavItem } from "@/lib/navigation";

/** Menu for the component gallery. Real role menus come from `getNavItems`. */
export const PREVIEW_NAV_ITEMS: readonly NavItem[] = [
  { href: "/onizleme/bilesenler", label: "Bileşenler" },
  { href: "/onizleme/durumlar", label: "Durumlar" },
];
