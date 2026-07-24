import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardIndex() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = session.isSuperAdmin
    ? await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } })
    : (
        await prisma.membership.findFirst({
          where: { userId: session.userId },
          include: { organization: true },
        })
      )?.organization;

  if (!org) redirect("/signup");
  redirect(`/dashboard/${org.id}`);
}
