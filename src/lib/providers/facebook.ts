import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";
import { isVideoUrl } from "./mediaType";

const GRAPH = "https://graph.facebook.com/v23.0";

/**
 * Facebook Pages via the Meta Graph API.
 * Requires a Meta app with pages_manage_posts, pages_read_engagement permissions.
 */
export const facebookAdapter: ProviderAdapter = {
  key: "facebook",
  label: "Facebook Page",

  getAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID || "",
      redirect_uri: redirectUri("facebook"),
      state,
      scope:
        "pages_show_list,pages_manage_posts,pages_read_engagement,business_management",
      response_type: "code",
    });
    return `https://www.facebook.com/v23.0/dialog/oauth?${params}`;
  },

  async handleCallback(code: string) {
    // 1. Exchange code for a user access token
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID || "",
          client_secret: process.env.META_APP_SECRET || "",
          redirect_uri: redirectUri("facebook"),
          code,
        })
    );
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new ProviderError("facebook", JSON.stringify(tokenJson));

    // 2. List the Pages this user manages; each Page has its own token
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,picture&access_token=${tokenJson.access_token}`
    );
    const pagesJson = await pagesRes.json();
    if (!pagesRes.ok) throw new ProviderError("facebook", JSON.stringify(pagesJson));

    return (pagesJson.data || []).map((p: any) => ({
      externalId: p.id,
      displayName: p.name,
      avatarUrl: p.picture?.data?.url,
      accessToken: p.access_token,
    }));
  },

  async publish({ body, mediaUrls, account }: PublishInput) {
    let res: Response;
    if (mediaUrls.length > 0 && isVideoUrl(mediaUrls[0])) {
      res = await fetch(`${GRAPH}/${account.externalId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: mediaUrls[0],
          description: body,
          access_token: account.accessToken,
        }),
      });
    } else if (mediaUrls.length > 0) {
      // Photo post (first image; Graph API supports multi-photo via batched uploads)
      res = await fetch(`${GRAPH}/${account.externalId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: mediaUrls[0],
          caption: body,
          access_token: account.accessToken,
        }),
      });
    } else {
      res = await fetch(`${GRAPH}/${account.externalId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body, access_token: account.accessToken }),
      });
    }
    const json = await res.json();
    if (!res.ok) throw new ProviderError("facebook", JSON.stringify(json));
    return { externalPostId: json.post_id || json.id };
  },

  async getMetrics({ externalId, accessToken }) {
    // Follower count (always available with pages_read_engagement).
    const pageRes = await fetch(
      `${GRAPH}/${externalId}?fields=followers_count,fan_count&access_token=${accessToken}`
    );
    const page = await pageRes.json();
    if (!pageRes.ok) throw new ProviderError("facebook", JSON.stringify(page));
    const followers = page.followers_count ?? page.fan_count ?? 0;

    // Reach & engagement (best-effort — insights can be unavailable on new Pages).
    let impressions = 0;
    let engagements = 0;
    try {
      const insRes = await fetch(
        `${GRAPH}/${externalId}/insights?metric=page_impressions,page_post_engagements&period=day&access_token=${accessToken}`
      );
      const ins = await insRes.json();
      for (const m of ins.data || []) {
        const v = m.values?.[m.values.length - 1]?.value || 0;
        if (m.name === "page_impressions") impressions = v;
        if (m.name === "page_post_engagements") engagements = v;
      }
    } catch {
      // leave impressions/engagements at 0 if insights aren't accessible
    }
    return { followers, impressions, engagements };
  },
};
