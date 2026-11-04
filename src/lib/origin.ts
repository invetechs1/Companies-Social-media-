/**
 * Public origin of the app as seen by the browser. Behind a reverse proxy
 * (nginx / Caddy / Traefik on the domain) `req.url` points at the internal
 * container address, so prefer the forwarded headers, then APP_URL.
 * Edge-runtime safe (used by middleware).
 */
type HeaderGetter = { get(name: string): string | null };

export function publicOrigin(headers: HeaderGetter, fallbackUrl?: string): string {
  const host = (headers.get("x-forwarded-host") || headers.get("host") || "")
    .split(",")[0]
    .trim();
  const isInternal = !host || /^(localhost|127\.|0\.0\.0\.0|\[::1\]|172\.\d+\.|10\.)/.test(host);
  if (host && !isInternal) {
    const proto = (headers.get("x-forwarded-proto") || "").split(",")[0].trim() || "http";
    return `${proto}://${host}`;
  }
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl.replace(/\/+$/, "");
  if (fallbackUrl) return new URL(fallbackUrl).origin;
  return "http://localhost:3000";
}

export function isHttps(headers: HeaderGetter): boolean {
  const proto = (headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  if (proto) return proto === "https";
  return (process.env.APP_URL || "").startsWith("https://");
}
