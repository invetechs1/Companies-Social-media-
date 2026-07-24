import Link from "next/link";
import { prisma } from "@/lib/db";
import { STATUS_META, PROVIDER_META, fmtDate } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function Overview({ params }: { params: { orgId: string } }) {
  const [org, accounts, scheduled, published, pending, recent] = await Promise.all([
    prisma.organization.findUnique({ where: { id: params.orgId } }),
    prisma.socialAccount.count({ where: { organizationId: params.orgId } }),
    prisma.post.count({ where: { organizationId: params.orgId, status: "scheduled" } }),
    prisma.post.count({ where: { organizationId: params.orgId, status: "published" } }),
    prisma.post.count({ where: { organizationId: params.orgId, status: "pending_approval" } }),
    prisma.post.findMany({
      where: { organizationId: params.orgId },
      include: { targets: { include: { socialAccount: { select: { provider: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const stats = [
    { label: "Connected accounts", value: accounts, href: "accounts" },
    { label: "Scheduled posts", value: scheduled, href: "calendar" },
    { label: "Published posts", value: published, href: "posts" },
    { label: "Awaiting approval", value: pending, href: "approvals" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{org?.name}</h1>
          <p className="text-slate-500 text-sm mt-1">Workspace overview</p>
        </div>
        <Link href={`/dashboard/${params.orgId}/composer`} className="btn-primary">✍️ New post</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={`/dashboard/${params.orgId}/${s.href}`} className="card p-5 hover:border-brand-300">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 card">
        <div className="p-4 border-b border-slate-200 font-semibold">Recent posts</div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No posts yet. <Link className="text-brand-600 hover:underline" href={`/dashboard/${params.orgId}/composer`}>Create your first post</Link>.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((p) => {
              const st = STATUS_META[p.status] || STATUS_META.draft;
              return (
                <li key={p.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{p.body}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      {p.targets.map((t) => (
                        <span key={t.id}>{PROVIDER_META[t.socialAccount.provider]?.icon}</span>
                      ))}
                      <span>{p.scheduledAt ? `Scheduled ${fmtDate(p.scheduledAt)}` : fmtDate(p.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`badge ${st.className}`}>{st.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
