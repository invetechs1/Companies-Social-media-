import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";
import { isVideoUrl } from "./mediaType";

const GRAPH = "https://graph.facebook.com/v23.0";

/**
 * Instagram Business accounts via the Meta Graph API (linked to a Facebook Page).
 * Publishing requires a public media URL (Instagram fetches it server-side).
 */
export const instagramAdapter: ProviderAdapter = {
  key: "instagram",
  label: "Instagram Business",

  getAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID || "",
      redirect_uri: redirectUri("instagram"),
      state,
      scope:
        "instagram_basic,instagram_content_publish,pages_show_list,business_management",
      response_type: "code",
    });
    return `https://www.facebook.com/v23.0/dialog/oauth?${params}`;
  },

  async handleCallback(code: string) {
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID || "",
          client_secret: process.env.META_APP_SECRET || "",
          redirect_uri: redirectUri("instagram"),
          code,
        })
    );
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new ProviderError("instagram", JSON.stringify(tokenJson));

    // Find IG business accounts linked to the user's Pages
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${tokenJson.access_token}`
    );
    const pagesJson = await pagesRes.json();
    if (!pagesRes.ok) throw new ProviderError("instagram", JSON.stringify(pagesJson));

    return (pagesJson.data || [])
      .filter((p: any) => p.instagram_business_account)
      .map((p: any) => ({
        externalId: p.instagram_business_account.id,
        displayName: `@${p.instagram_business_account.username}`,
        avatarUrl: p.instagram_business_account.profile_picture_url,
        accessToken: p.access_token,
      }));
  },

  async publish({ body, mediaUrls, account }: PublishInput) {
    if (mediaUrls.length === 0) {
      throw new ProviderError("instagram", "This post needs a photo or video attached before it can go to Instagram.");
    }
    const isVideo = isVideoUrl(mediaUrls[0]);

    // 1. Create a media container
    const containerRes = await fetch(`${GRAPH}/${account.externalId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isVideo
          ? { video_url: mediaUrls[0], media_type: "REELS", caption: body, access_token: account.accessToken }
          : { image_url: mediaUrls[0], caption: body, access_token: account.accessToken }
      ),
    });
    const container = await containerRes.json();
    if (!containerRes.ok) throw new ProviderError("instagram", JSON.stringify(container));

    // Video containers process asynchronously — wait until Instagram finishes
    // downloading/transcoding before publishing (images are ready immediately).
    // Kept well under the reverse proxy's 60s read timeout, which covers this
    // whole publish request (all of a post's targets run sequentially in one
    // call) — if a video is still processing when this returns, retrying the
    // post shortly after will find it already FINISHED and publish instantly.
    if (isVideo) {
      const deadline = Date.now() + 35_000;
      while (Date.now() < deadline) {
        const statusRes = await fetch(
          `${GRAPH}/${container.id}?fields=status_code&access_token=${account.accessToken}`
        );
        const statusJson = await statusRes.json();
        if (statusJson.status_code === "FINISHED") break;
        if (statusJson.status_code === "ERROR") {
          throw new ProviderError("instagram", "Instagram could not process this video. Please try a different file.");
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    // 2. Publish the container
    const publishRes = await fetch(`${GRAPH}/${account.externalId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: account.accessToken,
      }),
    });
    const published = await publishRes.json();
    if (!publishRes.ok) throw new ProviderError("instagram", JSON.stringify(published));
    return { externalPostId: published.id };
  },

  async comment({ externalPostId, message, account }) {
    const res = await fetch(`${GRAPH}/${externalPostId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: account.accessToken }),
    });
    if (!res.ok) throw new ProviderError("instagram", JSON.stringify(await res.json()));
  },

  async listComments({ externalPostId, accessToken }) {
    const res = await fetch(
      `${GRAPH}/${externalPostId}/comments?fields=id,text,username,timestamp&limit=25&access_token=${accessToken}`
    );
    const json = await res.json();
    if (!res.ok) throw new ProviderError("instagram", JSON.stringify(json));
    return (json.data || []).map((c: any) => ({
      id: c.id,
      from: c.username ? `@${c.username}` : "Someone",
      text: c.text || "",
      createdAt: c.timestamp,
    }));
  },

  async replyToComment({ commentId, message, accessToken }) {
    const res = await fetch(`${GRAPH}/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: accessToken }),
    });
    if (!res.ok) throw new ProviderError("instagram", JSON.stringify(await res.json()));
  },

  async getMetrics({ externalId, accessToken }) {
    // Followers from the IG business account profile.
    const profRes = await fetch(
      `${GRAPH}/${externalId}?fields=followers_count&access_token=${accessToken}`
    );
    const prof = await profRes.json();
    if (!profRes.ok) throw new ProviderError("instagram", JSON.stringify(prof));
    const followers = prof.followers_count ?? 0;

    // Reach & engagement (best-effort; account insights require recent activity).
    let impressions = 0;
    let engagements = 0;
    try {
      const insRes = await fetch(
        `${GRAPH}/${externalId}/insights?metric=impressions,reach,accounts_engaged&period=day&metric_type=total_value&access_token=${accessToken}`
      );
      const ins = await insRes.json();
      for (const m of ins.data || []) {
        const v = m.total_value?.value ?? m.values?.[m.values.length - 1]?.value ?? 0;
        if (m.name === "impressions") impressions = v;
        if (m.name === "accounts_engaged") engagements = v;
      }
    } catch {
      // ignore insights errors
    }
    return { followers, impressions, engagements };
  },
};
