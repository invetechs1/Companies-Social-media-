import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, requireOrgAccess } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId);
    const accounts = await prisma.socialAccount.findMany({
      where: { organizationId: params.orgId },
      select: {
        id: true, provider: true, externalId: true, displayName: true,
        avatarUrl: true, status: true, createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ accounts });
  });
}
