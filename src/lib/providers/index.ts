import { facebookAdapter } from "./facebook";
import { instagramAdapter } from "./instagram";
import { twitterAdapter } from "./twitter";
import { linkedinAdapter } from "./linkedin";
import { tiktokAdapter } from "./tiktok";
import { youtubeAdapter } from "./youtube";
import type { ProviderAdapter, ProviderKey } from "./types";

export const providers: Record<ProviderKey, ProviderAdapter> = {
  facebook: facebookAdapter,
  instagram: instagramAdapter,
  twitter: twitterAdapter,
  linkedin: linkedinAdapter,
  tiktok: tiktokAdapter,
  youtube: youtubeAdapter,
};

export const providerList = Object.values(providers);

export function getProvider(key: string): ProviderAdapter {
  const p = providers[key as ProviderKey];
  if (!p) throw new Error(`Unknown provider: ${key}`);
  return p;
}

export function isProviderConfigured(key: ProviderKey): boolean {
  switch (key) {
    case "facebook":
    case "instagram":
      return !!process.env.META_APP_ID;
    case "twitter":
      return !!process.env.TWITTER_CLIENT_ID;
    case "linkedin":
      return !!process.env.LINKEDIN_CLIENT_ID;
    case "tiktok":
      return !!process.env.TIKTOK_CLIENT_KEY;
    case "youtube":
      return !!process.env.GOOGLE_CLIENT_ID;
  }
}
