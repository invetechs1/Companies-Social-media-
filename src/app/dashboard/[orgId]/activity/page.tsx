import Link from "next/link";
import { prisma } from "@/lib/db";
import { PROVIDER_META, STATUS_META, postPermalink, fmtDate } from "@/lib/ui";

export const dynamic = "force-dynamic";

/**
 * Client-facing activity dashboard: for each connected account, show its
 * follower trend, recent published posts (with a link to the live post), and
 * engagement — plus a combined timeline of what's moving across all accounts.
 */
export default async function ActivityPage({ params }: { params: { orgId: string } }) {
  const org = await prisma.organization.findUnique({ where: { id: params.orgId } });

  const accounts = await prisma.socialAccount.findMany({
    where: { organizationId: params.orgId },
    include: {
      metrics: { orderBy: { capturedAt: "desc" }, take: 30 },
      targets: {
        where: { status: "published" },
        include: { post: { select: { body: true } } },
        orderBy: { publishedAt: "desc" },
        take: 3,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Combined recent activity across all accounts (published + failed deliveries).
  const recentTargets = await prisma.postTarget.findMany({
    where: {
      socialAccount: { organizationId: params.orgId },
      status: { in: ["published", "failed"] },
    },
    include: {
      socialAccount: { select: { provider: true, displayName: true } },
      post: { select: { body: true, author: { select: { name: true } } } },
    },
    orderBy: { publishedAt: "desc" },
    take: 15,
  });

  // Top-line totals from each account's latest snapshot.
  const latest = (a: (typeof accounts)[number]) => a.metrics[0];
  const totalFollowers = accounts.reduce((s, a) => s + (latest(a)?.followers || 0), 0);
  const weekAgoFollowers = accounts.reduce(
    (s, a) => s + (a.metrics[Math.min(7, a.metrics.length - 1)]?.followers || 0),
    0
  );
  const followerDelta = totalFollowers - weekAgoFollowers;
  const totalImpressions = accounts.reduce((s, a) => s + (latest(a)?.impressions || 0), 0);
  const totalEngagements = accounts.reduce((s, a) => s + (latest(a)?.engagements || 0), 0);
  const publishedCount = recentTargets.filter((t) => t.status === "published").length;

  const summary = [
    { label: "Total followers", value: totalFollowers.toLocaleString(), delta: followerDelta },
    { label: "Impressions (latest)", value: totalImpressions.toLocaleString() },
    { label: "Engagements (latest)", value: totalEngagements.toLocaleString() },
    { label: "Connected accounts", value: accounts.length },
  ];

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-slate-500 text-sm mt-1">
            What&apos;s happening across {org?.name}&apos;s social accounts.
          </p>
        </div>
        <Link href={`/dashboard/${params.orgId}/analytics`} className="btn-secondary">
          📈 Full analytics
        </Link>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-2xl font-bold tabular-nums">{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            {s.delta !== undefined && (
              <div className={`text-xs mt-2 font-medium ${s.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {s.delta >= 0 ? "▲" : "▼"} {Math.abs(s.delta).toLocaleString()} this week
              </div>
            )}
          </div>
        ))}
      </div>

      {accounts.length === 0 ? (
        <div className="mt-8 card p-10 text-center text-sm text-slate-500">
          No accounts connected yet.{" "}
          <Link className="text-brand-600 hover:underline" href={`/dashboard/${params.orgId}/accounts`}>
            Connect your social accounts
          </Link>{" "}
          to start tracking activity.
        </div>
      ) : (
        <>
          {/* Per-account cards */}
          <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Your accounts
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {accounts.map((a) => {
              const m = latest(a);
              const series = [...a.metrics].reverse(); // oldest → newest
              const first = series[0]?.followers ?? 0;
              const last = series[series.length - 1]?.followers ?? 0;
              const delta = last - first;
              const meta = PROVIDER_META[a.provider];
              return (
                <div key={a.id} className="card p-5">
                  <div className="flex items-center gap-3">
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatarUrl} alt="" className="h-9 w-9 rounded-full" />
                    ) : (
                      <div
                        className="h-9 w-9 rounded-full grid place-items-center text-white text-sm font-bold"
                        style={{ backgroundColor: meta?.color }}
                      >
                        {meta?.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{a.displayName}</div>
                      <div className="text-xs text-slate-500">{meta?.label}</div>
                    </div>
                    <span
                      className={`badge ${
                        a.status === "connected"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  {/* Followers + sparkline */}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold tabular-nums">
                        {(m?.followers ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        followers{" "}
                        {series.length > 1 && (
                          <span className={delta >= 0 ? "text-emerald-600" : "text-red-600"}>
                            ({delta >= 0 ? "+" : ""}
                            {delta.toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>
                    <Sparkline values={series.map((s) => s.followers)} color={meta?.color || "#3564fb"} />
                  </div>

                  {/* Engagement quick stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Impressions", m?.impressions],
                      ["Engagements", m?.engagements],
                      ["Clicks", m?.clicks],
                    ].map(([label, val]) => (
                      <div key={label as string} className="rounded-lg bg-slate-50 py-2">
                        <div className="text-sm font-semibold tabular-nums">
                          {(val as number | undefined)?.toLocaleString() ?? "—"}
                        </div>
                        <div className="text-[11px] text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent posts on this account */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Latest posts
                    </div>
                    {a.targets.length === 0 ? (
                      <p className="text-xs text-slate-400">No published posts yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {a.targets.map((t) => {
                          const url = postPermalink(a.provider, t.externalPostId);
                          return (
                            <li key={t.id} className="text-sm flex items-start gap-2">
                              <span className="flex-1 min-w-0">
                                <span className="line-clamp-1">{t.post.body}</span>
                                <span className="text-[11px] text-slate-400">
                                  {fmtDate(t.publishedAt)}
                                </span>
                              </span>
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-brand-600 hover:underline shrink-0"
                                >
                                  View ↗
                                </a>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Combined activity timeline */}
          <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Recent activity
          </h2>
          <div className="card divide-y divide-slate-100">
            {recentTargets.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No activity yet.</div>
            ) : (
              recentTargets.map((t) => {
                const meta = PROVIDER_META[t.socialAccount.provider];
                const url = postPermalink(t.socialAccount.provider, t.externalPostId);
                const ok = t.status === "published";
                return (
                  <div key={t.id} className="p-4 flex items-start gap-3">
                    <div
                      className="h-8 w-8 rounded-lg grid place-items-center text-white text-sm shrink-0"
                      style={{ backgroundColor: meta?.color }}
                    >
                      {meta?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className={ok ? "text-emerald-700 font-medium" : "text-red-700 font-medium"}>
                          {ok ? "Published to" : "Failed on"}
                        </span>{" "}
                        {t.socialAccount.displayName}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-1 mt-0.5">{t.post.body}</p>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {t.post.author?.name ? `by ${t.post.author.name} · ` : ""}
                        {fmtDate(t.publishedAt)}
                        {!ok && t.errorMessage ? ` · ${t.errorMessage.slice(0, 80)}` : ""}
                      </div>
                    </div>
                    {ok && url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:underline shrink-0"
                      >
                        View ↗
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Tiny inline SVG sparkline of follower counts. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 120;
  const H = 36;
  if (values.length < 2) {
    return <div className="text-[11px] text-slate-400">not enough data yet</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastX = W;
  const lastY = H - ((values[values.length - 1] - min) / range) * (H - 4) - 2;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}
