import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";
import { isVideoUrl } from "./mediaType";

/**
 * YouTube via Google OAuth + YouTube Data API v3.
 * Publishing here posts to the channel's community/feed is limited; the main
 * supported action is uploading videos (resumable upload from a URL is done
 * server-side by first fetching the file).
 */
export const youtubeAdapter: ProviderAdapter = {
  key: "youtube",
  label: "YouTube",

  getAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri: redirectUri("youtube"),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope:
        "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async handleCallback(code: string) {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri("youtube"),
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new ProviderError("youtube", JSON.stringify(tokenJson));

    const chRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
    );
    const chJson = await chRes.json();
    if (!chRes.ok) throw new ProviderError("youtube", JSON.stringify(chJson));
    const channel = chJson.items?.[0];
    if (!channel) throw new ProviderError("youtube", "No YouTube channel found.");

    return [
      {
        externalId: channel.id,
        displayName: channel.snippet.title,
        avatarUrl: channel.snippet.thumbnails?.default?.url,
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        tokenExpiresAt: tokenJson.expires_in
          ? new Date(Date.now() + tokenJson.expires_in * 1000)
          : undefined,
      },
    ];
  },

  async refresh(refreshToken: string) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new ProviderError("youtube", JSON.stringify(json));
    return {
      accessToken: json.access_token,
      // Google does not rotate refresh tokens on use — keep reusing the original.
      refreshToken,
      tokenExpiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
    };
  },

  async publish({ body, mediaUrls, account }: PublishInput) {
    if (mediaUrls.length === 0)
      throw new ProviderError("youtube", "This post needs a video attached before it can go to YouTube.");
    if (!isVideoUrl(mediaUrls[0]))
      throw new ProviderError("youtube", "YouTube only accepts video files. Please attach a video instead of an image.");

    // Fetch the video then upload via the simple upload endpoint
    const videoRes = await fetch(mediaUrls[0]);
    if (!videoRes.ok) throw new ProviderError("youtube", "Could not fetch video file.");
    const videoBuf = Buffer.from(await videoRes.arrayBuffer());

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify({
          snippet: {
            title: body.split("\n")[0].slice(0, 100) || "New video",
            description: body,
          },
          status: { privacyStatus: "public" },
        }),
      }
    );
    if (!initRes.ok) throw new ProviderError("youtube", await initRes.text());
    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) throw new ProviderError("youtube", "No upload URL returned.");

    const upRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/*" },
      body: videoBuf,
    });
    const upJson = await upRes.json();
    if (!upRes.ok) throw new ProviderError("youtube", JSON.stringify(upJson));
    return { externalPostId: upJson.id };
  },
};
