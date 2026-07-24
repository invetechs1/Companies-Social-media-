import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";

/**
 * TikTok via the Content Posting API.
 * Requires an approved TikTok developer app with video.publish scope.
 */
export const tiktokAdapter: ProviderAdapter = {
  key: "tiktok",
  label: "TikTok",

  getAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      response_type: "code",
      scope: "user.info.basic,video.publish",
      redirect_uri: redirectUri("tiktok"),
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  },

  async handleCallback(code: string) {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri("tiktok"),
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || tokenJson.error)
      throw new ProviderError("tiktok", JSON.stringify(tokenJson));

    const meRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
    );
    const meJson = await meRes.json();

    return [
      {
        externalId: tokenJson.open_id || meJson.data?.user?.open_id,
        displayName: meJson.data?.user?.display_name || "TikTok account",
        avatarUrl: meJson.data?.user?.avatar_url,
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        tokenExpiresAt: tokenJson.expires_in
          ? new Date(Date.now() + tokenJson.expires_in * 1000)
          : undefined,
      },
    ];
  },

  async publish({ body, mediaUrls, account }: PublishInput) {
    if (mediaUrls.length === 0)
      throw new ProviderError("tiktok", "TikTok requires a video file.");
    const res = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${account.accessToken}`,
        },
        body: JSON.stringify({
          post_info: {
            title: body.slice(0, 150),
            privacy_level: "PUBLIC_TO_EVERYONE",
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: mediaUrls[0],
          },
        }),
      }
    );
    const json = await res.json();
    if (!res.ok || json.error?.code !== "ok")
      throw new ProviderError("tiktok", JSON.stringify(json));
    return { externalPostId: json.data.publish_id };
  },
};
