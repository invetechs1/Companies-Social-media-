export type ProviderKey =
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "youtube";

export interface PublishInput {
  body: string;
  mediaUrls: string[];
  account: {
    externalId: string;
    accessToken: string;
    refreshToken?: string | null;
  };
}

export interface PublishResult {
  externalPostId: string;
}

export interface ProviderAdapter {
  key: ProviderKey;
  label: string;
  /** Build the URL the user is redirected to for OAuth consent. */
  getAuthUrl(state: string, codeChallenge?: string): string;
  /** Exchange the OAuth code for tokens + account info. May return several accounts (e.g. multiple Facebook Pages). */
  handleCallback(
    code: string,
    codeVerifier?: string
  ): Promise<
    Array<{
      externalId: string;
      displayName: string;
      avatarUrl?: string;
      accessToken: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
    }>
  >;
  /** Publish a post to this platform. */
  publish(input: PublishInput): Promise<PublishResult>;
}

export const APP_URL = process.env.APP_URL || "http://localhost:3000";

export function redirectUri(provider: ProviderKey) {
  return `${APP_URL}/api/oauth/${provider}/callback`;
}

export class ProviderError extends Error {
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`);
  }
}
