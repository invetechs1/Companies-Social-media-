import { prisma } from "./db";
import { getProvider } from "./providers";
import { APP_URL } from "./providers/types";

/** Uploaded media is stored as a relative "/uploads/..." path; providers need an absolute, publicly-fetchable URL. */
function toAbsoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${APP_URL}${url}`;
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** Refreshes an account's access token if the provider supports it and it's expired (or about to). */
async function ensureFreshAccessToken(account: {
  id: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}): Promise<string> {
  const provider = getProvider(account.provider);
  if (!provider.refresh || !account.refreshToken) return account.accessToken;

  const needsRefresh =
    !account.tokenExpiresAt || account.tokenExpiresAt.getTime() - Date.now() < REFRESH_BUFFER_MS;
  if (!needsRefresh) return account.accessToken;

  const result = await provider.refresh(account.refreshToken);
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? account.refreshToken,
      tokenExpiresAt: result.tokenExpiresAt ?? null,
    },
  });
  return result.accessToken;
}

/**
 * Publish a single post to all of its targets.
 * Each target succeeds or fails independently.
 */
export async function publishPost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { targets: { include: { socialAccount: true } } },
  });
  if (!post) throw new Error("Post not found");

  await prisma.post.update({ where: { id: postId }, data: { status: "publishing" } });

  const mediaUrls: string[] = JSON.parse(post.mediaUrls || "[]").map(toAbsoluteUrl);
  let anySuccess = false;
  let anyFailure = false;

  for (const target of post.targets) {
    if (target.status === "published") { anySuccess = true; continue; }
    try {
      const provider = getProvider(target.socialAccount.provider);
      const accessToken = await ensureFreshAccessToken(target.socialAccount);
      const result = await provider.publish({
        body: target.bodyOverride || post.body,
        mediaUrls,
        account: {
          externalId: target.socialAccount.externalId,
          accessToken,
          refreshToken: target.socialAccount.refreshToken,
        },
      });
      await prisma.postTarget.update({
        where: { id: target.id },
        data: {
          status: "published",
          externalPostId: result.externalPostId,
          publishedAt: new Date(),
          errorMessage: null,
        },
      });
      anySuccess = true;
    } catch (err: any) {
      anyFailure = true;
      await prisma.postTarget.update({
        where: { id: target.id },
        data: { status: "failed", errorMessage: String(err?.message || err).slice(0, 1000) },
      });
    }
  }

  const finalStatus = anyFailure && !anySuccess ? "failed" : anyFailure ? "failed" : "published";
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: finalStatus,
      publishedAt: anySuccess ? new Date() : undefined,
    },
  });
  return { status: finalStatus };
}

/**
 * Find every approved/scheduled post whose time has come and publish it.
 * Called by the cron endpoint and the worker script.
 */
export async function publishDuePosts() {
  const due = await prisma.post.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
    },
    select: { id: true },
    take: 20,
  });
  const results = [];
  for (const p of due) {
    try {
      results.push({ id: p.id, ...(await publishPost(p.id)) });
    } catch (err: any) {
      results.push({ id: p.id, status: "error", error: String(err?.message || err) });
    }
  }
  return results;
}
