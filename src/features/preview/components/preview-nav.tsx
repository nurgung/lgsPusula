"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/onizleme/ogrenci", label: "Öğrenci" },
  { href: "/onizleme/veli", label: "Veli" },
  { href: "/onizleme/yonetici", label: "Yönetici" },
  { href: "/onizleme/durumlar", label: "Durumlar" },
] as const;

export function PreviewNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Önizleme sayfaları"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:static sm:border-t-0 sm:border-b sm:pb-0"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-4 sm:flex sm:gap-2 sm:px-4">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center justify-center px-2 text-sm font-semibold sm:min-h-12 sm:px-3",
                  active
                    ? "text-brand-700 underline decoration-2 underline-offset-8"
                    : "text-ink-700 hover:text-brand-700",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
