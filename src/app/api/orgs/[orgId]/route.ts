import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  brandColor: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  customDomain: z.string().nullable().optional(),
  plan: z.string().optional(),
  planStatus: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { orgId: string } }) {
  const body = await req.json();
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "admin");
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    // Plan changes are reserved for the platform owner (you, when reselling)
    if ((parsed.data.plan || parsed.data.planStatus) && !session.isSuperAdmin) {
      return jsonError("Only the platform owner can change plans.", 403);
    }
    const org = await prisma.organization.update({ where: { id: params.orgId }, data: parsed.data });
    return NextResponse.json({ organization: org });
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    if (!session.isSuperAdmin) return jsonError("Only the platform owner can delete a workspace.", 403);
    await prisma.organization.delete({ where: { id: params.orgId } });
    return NextResponse.json({ ok: true });
  });
}
