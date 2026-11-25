/**
 * UTM link tagging. When a tenant enables UTM tracking, outbound links in a
 * post are tagged at publish time so the destination site's analytics can
 * attribute the traffic (utm_source = the network, utm_medium = social).
 *
 * Links that already carry a utm_source are left untouched, so manually
 * tagged links win.
 */

const URL_RE = /(https?:\/\/[^\s<>()]+)/gi;

export interface UtmParams {
  source: string; // the platform, e.g. "instagram"
  medium?: string; // default "social"
  campaign?: string; // default "social"
}

function tagUrl(rawUrl: string, params: UtmParams): string {
  // Strip trailing punctuation that commonly follows a URL in prose.
  const trailingMatch = rawUrl.match(/[).,!?]+$/);
  const trailing = trailingMatch ? trailingMatch[0] : "";
  const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

  try {
    const u = new URL(url);
    if (u.searchParams.has("utm_source")) return rawUrl; // respect existing tags
    u.searchParams.set("utm_source", params.source);
    u.searchParams.set("utm_medium", params.medium || "social");
    u.searchParams.set("utm_campaign", params.campaign || "social");
    return u.toString() + trailing;
  } catch {
    return rawUrl; // not a parseable URL — leave as-is
  }
}

/** Returns the text with every outbound link UTM-tagged. */
export function addUtm(text: string, params: UtmParams): string {
  if (!text) return text;
  return text.replace(URL_RE, (m) => tagUrl(m, params));
}
