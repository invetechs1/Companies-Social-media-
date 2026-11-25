import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeLocale, isRtl } from "@/lib/i18n";
import Sidebar from "./sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgId: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: params.orgId } });
  if (!org) redirect("/dashboard");

  if (!session.isSuperAdmin) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: session.userId, organizationId: org.id } },
    });
    if (!membership) redirect("/dashboard");
  }

  const orgs = session.isSuperAdmin
    ? await prisma.organization.findMany({ orderBy: { createdAt: "asc" } })
    : (
        await prisma.membership.findMany({
          where: { userId: session.userId },
          include: { organization: true },
        })
      ).map((m) => m.organization);

  const locale = normalizeLocale(cookies().get("locale")?.value);

  return (
    <div className="min-h-screen flex" dir={isRtl(locale) ? "rtl" : "ltr"} lang={locale}>
      <Sidebar
        org={{ id: org.id, name: org.name, brandColor: org.brandColor, logoUrl: org.logoUrl }}
        orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}
        user={{ name: session.name, isSuperAdmin: session.isSuperAdmin }}
        locale={locale}
      />
      <main className="flex-1 min-w-0 p-6 lg:p-8">{children}</main>
    </div>
  );
}
