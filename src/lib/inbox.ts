import { prisma } from "./db";
import { getProvider } from "./providers";
import { ensureFreshAccessToken } from "./publisher";

/**
 * Unified inbox: collects comments across a workspace's recently published
 * Facebook & Instagram posts (the platforms that expose post comments on the
 * basic API tiers), so the team can read and reply in one place.
 */

export interface InboxItem {
  commentId: string;
  provider: string;
  accountId: string;
  accountName: string;
  postId: string; // internal Post id
  postBody: string;
  from: string;
  text: string;
  createdAt?: string;
}

export async function fetchInbox(organizationId: string, limit = 10): Promise<InboxItem[]> {
  // Recent published targets on providers that support comment listing.
  const targets = await prisma.postTarget.findMany({
    where: {
      status: "published",
      externalPostId: { not: null },
      socialAccount: { organizationId, provider: { in: ["facebook", "instagram"] } },
    },
    include: {
      socialAccount: true,
      post: { select: { id: true, body: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  const items: InboxItem[] = [];
  for (const t of targets) {
    const provider = getProvider(t.socialAccount.provider);
    if (!provider.listComments || !t.externalPostId) continue;
    try {
      const accessToken = await ensureFreshAccessToken(t.socialAccount);
      const comments = await provider.listComments({ externalPostId: t.externalPostId, accessToken });
      for (const c of comments) {
        items.push({
          commentId: c.id,
          provider: t.socialAccount.provider,
          accountId: t.socialAccount.id,
          accountName: t.socialAccount.displayName,
          postId: t.post.id,
          postBody: t.post.body,
          from: c.from,
          text: c.text,
          createdAt: c.createdAt,
        });
      }
    } catch (err: any) {
      // A single post's comments failing shouldn't break the whole inbox.
      console.error(`[inbox] ${t.socialAccount.provider} ${t.externalPostId}:`, err?.message || err);
    }
  }
  // Newest first across all accounts.
  items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return items;
}

export async function replyInInbox(accountId: string, commentId: string, message: string) {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Account not found");
  const provider = getProvider(account.provider);
  if (!provider.replyToComment) throw new Error("This platform does not support replies.");
  const accessToken = await ensureFreshAccessToken(account);
  await provider.replyToComment({ commentId, message, accessToken });
}
