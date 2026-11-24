import { prisma } from "./db";
import { getProvider } from "./providers";
import { ensureFreshAccessToken } from "./publisher";

/**
 * Pulls fresh audience & reach metrics from each connected account's platform
 * and stores one MetricSnapshot per account. Providers that can't expose
 * metrics (LinkedIn members, TikTok, YouTube on the basic tiers) are skipped.
 *
 * Deduped to at most one snapshot per account per calendar day so repeated
 * cron hits (or a worker tick) don't inflate the history.
 */

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function syncAccountMetrics(accountId: string): Promise<boolean> {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
  if (!account) return false;

  const provider = getProvider(account.provider);
  if (!provider.getMetrics) return false; // provider can't report metrics

  const accessToken = await ensureFreshAccessToken(account);
  let metrics;
  try {
    metrics = await provider.getMetrics({ externalId: account.externalId, accessToken });
  } catch (err: any) {
    // Mark the account so the UI can surface a reconnect prompt, but don't throw.
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: { status: "error" },
    });
    console.error(`[metrics] ${account.provider}/${account.displayName}:`, err?.message || err);
    return false;
  }

  // One snapshot per account per day — update today's if it already exists.
  const existing = await prisma.metricSnapshot.findFirst({
    where: { socialAccountId: account.id, capturedAt: { gte: startOfToday() } },
    orderBy: { capturedAt: "desc" },
  });
  const data = {
    followers: metrics.followers ?? 0,
    impressions: metrics.impressions ?? 0,
    engagements: metrics.engagements ?? 0,
    clicks: metrics.clicks ?? 0,
  };
  if (existing) {
    await prisma.metricSnapshot.update({ where: { id: existing.id }, data });
  } else {
    await prisma.metricSnapshot.create({ data: { socialAccountId: account.id, ...data } });
  }

  if (account.status !== "connected") {
    await prisma.socialAccount.update({ where: { id: account.id }, data: { status: "connected" } });
  }
  return true;
}

/** Sync every connected account across all tenants (or one org when scoped). */
export async function syncAllMetrics(organizationId?: string) {
  const accounts = await prisma.socialAccount.findMany({
    where: { ...(organizationId ? { organizationId } : {}) },
    select: { id: true, provider: true },
  });
  let synced = 0;
  let skipped = 0;
  for (const a of accounts) {
    const ok = await syncAccountMetrics(a.id);
    ok ? synced++ : skipped++;
  }
  return { total: accounts.length, synced, skipped };
}
