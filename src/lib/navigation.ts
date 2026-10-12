export type NavItem = { href: string; label: string };

/**
 * Returns the href of the item that should be marked as the current page: the longest
 * href that equals the path or is a parent segment of it. "/ogrenci" is therefore not
 * active on "/ogrenci/calisma", and "/veli" never matches "/veliler".
 */
export function getActiveHref(
  pathname: string,
  items: readonly NavItem[],
): string | undefined {
  let best: string | undefined;
  for (const { href } of items) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}
