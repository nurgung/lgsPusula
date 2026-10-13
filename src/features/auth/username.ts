// No imports: also used by the account scripts in `scripts/`, which run outside the bundler.

/** Lowercase ASCII only, so the same name cannot be written two ways (e.g. "I"/"ı"). */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

/**
 * Supabase Auth needs an e-mail address, but the app sends no e-mail (decision 0.8). Each
 * username maps to an address on the reserved `.invalid` TLD (RFC 2606), which can never be
 * delivered, so no real e-mail address is stored.
 */
export const AUTH_EMAIL_DOMAIN = "users.lgs-pusula.invalid";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function usernameToAuthEmail(username: string): string {
  if (!isValidUsername(username)) {
    throw new Error("Invalid username format.");
  }
  return `${username}@${AUTH_EMAIL_DOMAIN}`;
}
