import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";

/**
 * LinkedIn member/organization posts via the LinkedIn REST API.
 * Requires an app with w_member_social (and w_organization_social for company pages).
 */

/**
 * LinkedIn requires a "LinkedIn-Version: YYYYMM" header, and each version stops being
 * accepted ~12 months after release. Compute a recent-but-not-bleeding-edge version at
 * request time instead of hardcoding a date that will eventually go stale again.
 */
function linkedinApiVersion(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export const linkedinAdapter: ProviderAdapter = {
  key: "linkedin",
  label: "LinkedIn",

  getAuthUrl(state: string) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      redirect_uri: redirectUri("linkedin"),
      state,
      scope: "openid profile w_member_social",
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  },

  async handleCallback(code: string) {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri("linkedin"),
        client_id: process.env.LINKEDIN_CLIENT_ID || "",
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new ProviderError("linkedin", JSON.stringify(tokenJson));

    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const meJson = await meRes.json();
    if (!meRes.ok) throw new ProviderError("linkedin", JSON.stringify(meJson));

    return [
      {
        externalId: meJson.sub,
        displayName: meJson.name,
        avatarUrl: meJson.picture,
        accessToken: tokenJson.access_token,
        tokenExpiresAt: tokenJson.expires_in
          ? new Date(Date.now() + tokenJson.expires_in * 1000)
          : undefined,
      },
    ];
  },

  async publish({ body, account }: PublishInput) {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": linkedinApiVersion(),
      },
      body: JSON.stringify({
        author: `urn:li:person:${account.externalId}`,
        commentary: body,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      // LinkedIn rejects re-submitting identical content it already accepted (spam
      // protection). That means the post genuinely exists — treat it as success
      // instead of a failure that invites endless, pointless retries.
      const duplicate = text.match(/duplicate of (urn:li:share:\d+)/);
      if (duplicate) return { externalPostId: duplicate[1] };
      throw new ProviderError("linkedin", text);
    }
    const id = res.headers.get("x-restli-id") || "";
    return { externalPostId: id };
  },
};
