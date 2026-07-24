import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";

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
    return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
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
      throw new ProviderError("instagram", "Instagram requires at least one image or video.");
    }
    // 1. Create a media container
    const containerRes = await fetch(`${GRAPH}/${account.externalId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: mediaUrls[0],
        caption: body,
        access_token: account.accessToken,
      }),
    });
    const container = await containerRes.json();
    if (!containerRes.ok) throw new ProviderError("instagram", JSON.stringify(container));

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
};
