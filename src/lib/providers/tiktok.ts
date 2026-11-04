import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";

/**
 * TikTok via the Content Posting API.
 * Requires an approved TikTok developer app with video.publish scope.
 */
export const tiktokAdapter: ProviderAdapter = {
  key: "tiktok",
  label: "TikTok",

  getAuthUrl(state: string, codeChallenge?: string) {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      response_type: "code",
      scope: "user.info.basic,video.publish",
      redirect_uri: redirectUri("tiktok"),
      state,
      code_challenge: codeChallenge || "",
      code_challenge_method: "S256",
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  },

  async handleCallback(code: string, codeVerifier?: string) {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri("tiktok"),
        code_verifier: codeVerifier || "",
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

    // Unaudited apps (and private accounts) can't post PUBLIC_TO_EVERYONE —
    // TikTok requires querying which privacy levels this creator actually
    // allows and picking one of those, rather than assuming public is valid.
    const creatorRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${account.accessToken}`,
        },
      }
    );
    const creatorJson = await creatorRes.json();
    if (!creatorRes.ok || creatorJson.error?.code !== "ok")
      throw new ProviderError("tiktok", JSON.stringify(creatorJson));

    // Prefer public; while the app is unaudited TikTok won't offer that
    // option at all, and requires SELF_ONLY specifically (not just "any
    // non-public" level like FOLLOWER_OF_CREATOR) — so prefer that over
    // just taking whichever option TikTok happened to list first.
    const privacyOptions: string[] = creatorJson.data?.privacy_level_options || [];
    const privacyLevel = ["PUBLIC_TO_EVERYONE", "SELF_ONLY"].find((p) =>
      privacyOptions.includes(p)
    ) || privacyOptions[0];
    if (!privacyLevel)
      throw new ProviderError("tiktok", "No privacy level available for this TikTok account.");

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
            privacy_level: privacyLevel,
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
    const publishId = json.data.publish_id;

    // PULL_FROM_URL is async: TikTok fetches/validates the video *after*
    // this call already returned "ok", so a bad file (wrong frame rate,
    // codec, etc.) fails silently unless we poll the real outcome here.
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${account.accessToken}`,
          },
          body: JSON.stringify({ publish_id: publishId }),
        }
      );
      const statusJson = await statusRes.json();
      const status = statusJson.data?.status;
      if (status === "FAILED") {
        throw new ProviderError(
          "tiktok",
          `Video rejected by TikTok: ${statusJson.data?.fail_reason || "unknown reason"}`
        );
      }
      if (status === "PUBLISH_COMPLETE" || status === "SEND_TO_USER_INBOX") break;
      // otherwise still PROCESSING_DOWNLOAD / PROCESSING_UPLOAD — keep polling
    }

    return { externalPostId: publishId };
  },
};
