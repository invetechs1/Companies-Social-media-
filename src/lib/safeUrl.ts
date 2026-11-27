/**
 * URL safety helpers for user-supplied links that end up as hrefs on public
 * pages. `z.string().url()` alone accepts any scheme (javascript:, data:, …),
 * which would be stored XSS on a public page, so only http(s) is allowed.
 */

export function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Media may be an http(s) URL or one of this app's own relative upload paths. */
export function isSafeMediaRef(value: string): boolean {
  return isSafeHttpUrl(value) || /^\/(api\/)?uploads\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(value);
}
