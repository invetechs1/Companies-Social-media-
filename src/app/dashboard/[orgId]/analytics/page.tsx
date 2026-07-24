import { prisma } from "@/lib/db";
import { PROVIDER_META } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: { orgId: string } }) {
  const accounts = await prisma.socialAccount.findMany({
    where: { organizationId: params.orgId },
    include: { metrics: { orderBy: { capturedAt: "desc" }, take: 30 } },
  });

  const posts = await prisma.post.findMany({
    where: { organizationId: params.orgId, status: "published" },
    include: { targets: true },
    orderBy: { publishedAt: "desc" },
    take: 10,
  });

  const totalFollowers = accounts.reduce((sum, a) => sum + (a.metrics[0]?.followers || 0), 0);
  const totalImpressions = accounts.reduce((sum, a) => sum + (a.metrics[0]?.impressions || 0), 0);
  const totalEngagements = accounts.reduce((sum, a) => sum + (a.metrics[0]?.engagements || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="text-sm text-slate-500 mt-1">
        Cross-platform performance for this workspace. Metrics refresh from each platform&apos;s API.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total followers", value: totalFollowers },
          { label: "Impressions (latest)", value: totalImpressions },
          { label: "Engagements (latest)", value: totalEngagements },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-3xl font-bold">{s.value.toLocaleString()}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 card">
        <div className="p-4 border-b border-slate-200 font-semibold">By account</div>
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Connect social accounts to see analytics.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="p-3">Account</th>
                <th className="p-3">Followers</th>
                <th className="p-3">Impressions</th>
                <th className="p-3">Engagements</th>
                <th className="p-3">Trend (30 snapshots)</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const latest = a.metrics[0];
                const series = [...a.metrics].reverse();
                const max = Math.max(1, ...series.map((m) => m.followers));
                return (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="p-3">{PROVIDER_META[a.provider]?.icon} {a.displayName}</td>
                    <td className="p-3">{latest?.followers?.toLocaleString() ?? "—"}</td>
                    <td className="p-3">{latest?.impressions?.toLocaleString() ?? "—"}</td>
                    <td className="p-3">{latest?.engagements?.toLocaleString() ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex items-end gap-0.5 h-8">
                        {series.map((m) => (
                          <div
                            key={m.id}
                            className="w-1.5 bg-brand-400 rounded-sm"
                            style={{ height: `${Math.max(8, (m.followers / max) * 100)}%` }}
                          />
                        ))}
                        {series.length === 0 && <span className="text-xs text-slate-400">no data yet</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 card">
        <div className="p-4 border-b border-slate-200 font-semibold">Recently published</div>
        {posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No published posts yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {posts.map((p) => (
              <li key={p.id} className="p-4 text-sm flex items-center gap-3">
                <span className="flex-1 truncate">{p.body}</span>
                <span className="text-xs text-slate-500">
                  {p.targets.filter((t) => t.status === "published").length}/{p.targets.length} platforms
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
