import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  url: z.string().url().optional(),
  order: z.number().optional(),
});

async function linkOrg(id: string) {
  const link = await prisma.bioLink.findUnique({ where: { id } });
  return link;
}

export async function PATCH(req: NextRequest, { params }: { params: { linkId: string } }) {
  const raw = await req.json();
  return withAuth(async (session) => {
    const link = await linkOrg(params.linkId);
    if (!link) return jsonError("Link not found", 404);
    await requireOrgAccess(session.userId, link.organizationId, "editor");
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    const updated = await prisma.bioLink.update({ where: { id: params.linkId }, data: parsed.data });
    return NextResponse.json({ link: updated });
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { linkId: string } }) {
  return withAuth(async (session) => {
    const link = await linkOrg(params.linkId);
    if (!link) return jsonError("Link not found", 404);
    await requireOrgAccess(session.userId, link.organizationId, "editor");
    await prisma.bioLink.delete({ where: { id: params.linkId } });
    return NextResponse.json({ ok: true });
  });
}
