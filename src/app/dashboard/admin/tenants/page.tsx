import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import NewTenantForm from "./new-tenant-form";

export const dynamic = "force-dynamic";

/**
 * Platform-owner panel: every tenant (company) on the platform.
 * This is where you onboard companies you sell the system to.
 */
export default async function TenantsPage() {
  const session = await getSession();
  if (!session?.isSuperAdmin) redirect("/dashboard");

  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { memberships: true, socialAccounts: true, posts: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl p-8">
      <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">← Back to dashboard</Link>
      <div className="flex items-center justify-between mt-2">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every company running on your platform — your own brands and the customers you sell to.
          </p>
        </div>
      </div>

      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="p-3">Company</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Members</th>
              <th className="p-3">Accounts</th>
              <th className="p-3">Posts</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-b border-slate-50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md text-white grid place-items-center text-xs font-bold" style={{ backgroundColor: o.brandColor }}>
                      {o.name[0]}
                    </div>
                    <div>
                      <div className="font-medium">{o.name}</div>
                      <div className="text-xs text-slate-400">/{o.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 capitalize">{o.plan}</td>
                <td className="p-3">
                  <span className={`badge capitalize ${o.planStatus === "active" ? "bg-emerald-100 text-emerald-800" : o.planStatus === "trial" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>
                    {o.planStatus}
                  </span>
                </td>
                <td className="p-3">{o._count.memberships}</td>
                <td className="p-3">{o._count.socialAccounts}</td>
                <td className="p-3">{o._count.posts}</td>
                <td className="p-3">
                  <Link href={`/dashboard/${o.id}`} className="text-brand-600 hover:underline text-xs">Open →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 max-w-md">
        <NewTenantForm />
      </div>
    </div>
  );
}
