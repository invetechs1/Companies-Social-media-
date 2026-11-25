import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, requireOrgAccess } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    const membership = await requireOrgAccess(session.userId, params.orgId);
    // Connecting/disconnecting accounts needs admin or owner (super admins pass as owner).
    const canManage = membership.role === "admin" || membership.role === "owner";
    const accounts = await prisma.socialAccount.findMany({
      where: { organizationId: params.orgId },
      select: {
        id: true, provider: true, externalId: true, displayName: true,
        avatarUrl: true, status: true, createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ accounts, canManage });
  });
}
