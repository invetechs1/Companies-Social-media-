import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";

/**
 * X (Twitter) via API v2 with OAuth 2.0 + PKCE.
 * Requires a project/app on developer.x.com with tweet.write scope.
 */
export const twitterAdapter: ProviderAdapter = {
  key: "twitter",
  label: "X (Twitter)",

  getAuthUrl(state: string, codeChallenge?: string) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.TWITTER_CLIENT_ID || "",
      redirect_uri: redirectUri("twitter"),
      scope: "tweet.read tweet.write users.read offline.access",
      state,
      code_challenge: codeChallenge || "",
      code_challenge_method: "S256",
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  },

  async handleCallback(code: string, codeVerifier?: string) {
    const basic = Buffer.from(
      `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
    ).toString("base64");
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri("twitter"),
        code_verifier: codeVerifier || "",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new ProviderError("twitter", JSON.stringify(tokenJson));

    const meRes = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
      { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
    );
    const meJson = await meRes.json();
    if (!meRes.ok) throw new ProviderError("twitter", JSON.stringify(meJson));

    return [
      {
        externalId: meJson.data.id,
        displayName: `@${meJson.data.username}`,
        avatarUrl: meJson.data.profile_image_url,
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        tokenExpiresAt: tokenJson.expires_in
          ? new Date(Date.now() + tokenJson.expires_in * 1000)
          : undefined,
      },
    ];
  },

  async publish({ body, account }: PublishInput) {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.accessToken}`,
      },
      body: JSON.stringify({ text: body.slice(0, 280) }),
    });
    const json = await res.json();
    if (!res.ok) throw new ProviderError("twitter", JSON.stringify(json));
    return { externalPostId: json.data.id };
  },
};
