/** Shell cached for the offline page. Authenticated HTML is never in this list. */
export const OFFLINE_CACHE_NAME = "lgs-pusula-shell-v1";
export const OFFLINE_PATH = "/cevrimdisi";

export const SHELL_PATHS = [
  OFFLINE_PATH,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
] as const;

const SENSITIVE_PREFIXES = [
  "/ogrenci",
  "/veli",
  "/yonetici",
  "/hesap",
  "/giris",
  "/parola-degistir",
] as const;

/**
 * A navigation is always fetched from the network. On failure the static offline
 * page is shown. The previous page is not kept, so study logs and exam results
 * are not stored on the device.
 */
export function navigationUsesNetworkOnly(mode: string): boolean {
  return mode === "navigate";
}

export function mayReadShellCache(pathname: string): boolean {
  return (SHELL_PATHS as readonly string[]).includes(pathname);
}

export function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
