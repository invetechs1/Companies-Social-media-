import { ProviderAdapter, ProviderError, PublishInput, redirectUri } from "./types";

/**
 * LinkedIn member/organization posts via the LinkedIn REST API.
 * Requires an app with w_member_social (and w_organization_social for company pages).
 */

/**
 * LinkedIn only keeps ~12 trailing months of API versions active, so a
 * hardcoded value (e.g. "202411") eventually starts failing with
 * 426 NONEXISTENT_VERSION. Use last month's version to stay comfortably
 * inside the active window (this month's may not be rolled out yet).
 */
function linkedinApiVersion(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

/**
 * Registers an image upload with LinkedIn, uploads the bytes fetched from
 * `url`, and returns the resulting image URN (e.g. "urn:li:image:...") to
 * reference from a post's `content.media`/`content.multiImage`.
 */
async function uploadLinkedInImage(accessToken: string, owner: string, url: string): Promise<string> {
  const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": linkedinApiVersion(),
    },
    body: JSON.stringify({ initializeUploadRequest: { owner } }),
  });
  if (!initRes.ok) throw new ProviderError("linkedin", `image init failed: ${await initRes.text()}`);
  const initJson = await initRes.json();
  const uploadUrl: string = initJson.value.uploadUrl;
  const imageUrn: string = initJson.value.image;

  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new ProviderError("linkedin", `Could not fetch media: ${url}`);
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imgBuf,
  });
  if (!putRes.ok) throw new ProviderError("linkedin", `image upload failed: ${await putRes.text()}`);

  return imageUrn;
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

  async publish({ body, mediaUrls, account }: PublishInput) {
    const owner = `urn:li:person:${account.externalId}`;

    let content: Record<string, unknown> | undefined;
    if (mediaUrls.length === 1) {
      const imageUrn = await uploadLinkedInImage(account.accessToken, owner, mediaUrls[0]);
      content = { media: { id: imageUrn } };
    } else if (mediaUrls.length > 1) {
      const imageUrns = await Promise.all(
        mediaUrls.map((url) => uploadLinkedInImage(account.accessToken, owner, url))
      );
      content = { multiImage: { images: imageUrns.map((id) => ({ id })) } };
    }

    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": linkedinApiVersion(),
      },
      body: JSON.stringify({
        author: owner,
        commentary: body,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        ...(content ? { content } : {}),
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ProviderError("linkedin", text);
    }
    const id = res.headers.get("x-restli-id") || "";
    return { externalPostId: id };
  },
};
