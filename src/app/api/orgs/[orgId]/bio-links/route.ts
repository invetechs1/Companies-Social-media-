import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";
import { isSafeHttpUrl } from "@/lib/safeUrl";

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId);
    const links = await prisma.bioLink.findMany({
      where: { organizationId: params.orgId },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ links });
  });
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z
    .string()
    .url("Enter a valid URL (including https://)")
    .refine(isSafeHttpUrl, "Only http:// or https:// links are allowed"),
});

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const raw = await req.json();
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "editor");
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    const count = await prisma.bioLink.count({ where: { organizationId: params.orgId } });
    const link = await prisma.bioLink.create({
      data: { ...parsed.data, order: count, organizationId: params.orgId },
    });
    return NextResponse.json({ link });
  });
}
