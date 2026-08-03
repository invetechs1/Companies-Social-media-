import { prisma } from "./db";
import { getProvider } from "./providers";
import { APP_URL } from "./providers/types";

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

  // Media is stored as a relative path (e.g. "/uploads/{orgId}/{file}"); every
  // provider either fetches it itself (YouTube, LinkedIn) or hands the URL to
  // the platform to fetch (Facebook, Instagram, TikTok), so it must be absolute.
  const mediaUrls: string[] = JSON.parse(post.mediaUrls || "[]").map((u: string) =>
    /^https?:\/\//i.test(u) ? u : `${APP_URL}${u}`
  );
  let anySuccess = false;
  let anyFailure = false;

  for (const target of post.targets) {
    if (target.status === "published") { anySuccess = true; continue; }
    try {
      const provider = getProvider(target.socialAccount.provider);
      const result = await provider.publish({
        body: target.bodyOverride || post.body,
        mediaUrls,
        account: {
          externalId: target.socialAccount.externalId,
          accessToken: target.socialAccount.accessToken,
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
