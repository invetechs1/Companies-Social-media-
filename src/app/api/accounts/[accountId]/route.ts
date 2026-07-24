import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";

export async function DELETE(_req: NextRequest, { params }: { params: { accountId: string } }) {
  return withAuth(async (session) => {
    const account = await prisma.socialAccount.findUnique({ where: { id: params.accountId } });
    if (!account) return jsonError("Account not found", 404);
    await requireOrgAccess(session.userId, account.organizationId, "admin");
    await prisma.socialAccount.delete({ where: { id: params.accountId } });
    return NextResponse.json({ ok: true });
  });
}
