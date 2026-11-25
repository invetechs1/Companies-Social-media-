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

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

/** A point-in-time snapshot of an account's audience & reach, pulled from the platform. */
export interface AccountMetrics {
  followers?: number;
  impressions?: number;
  engagements?: number;
  clicks?: number;
}

export interface MetricsInput {
  externalId: string;
  accessToken: string;
}

export interface ProviderAdapter {
  key: ProviderKey;
  label: string;
  /** Build the URL the user is redirected to for OAuth consent. */
  getAuthUrl(state: string, codeChallenge?: string): string;
  /** Optional: exchange a refresh token for a new access token. Only implemented by providers with short-lived tokens. */
  refresh?(refreshToken: string): Promise<TokenRefreshResult>;
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
  /** Optional: fetch current audience & reach metrics for an account. */
  getMetrics?(input: MetricsInput): Promise<AccountMetrics>;
  /** Optional: add a comment under a just-published post (used for first comment / hashtags). */
  comment?(input: CommentInput): Promise<void>;
  /** Optional: list comments on a published post (unified inbox). */
  listComments?(input: ListCommentsInput): Promise<InboxComment[]>;
  /** Optional: reply to a specific comment (unified inbox). */
  replyToComment?(input: ReplyInput): Promise<void>;
}

export interface CommentInput {
  externalPostId: string;
  message: string;
  account: { externalId: string; accessToken: string };
}

export interface ListCommentsInput {
  externalPostId: string;
  accessToken: string;
}

export interface InboxComment {
  id: string;
  from: string;
  text: string;
  createdAt?: string;
}

export interface ReplyInput {
  commentId: string;
  message: string;
  accessToken: string;
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
