import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError } from "@/lib/api";

export async function GET() {
  return withAuth(async (session) => {
    const orgs = session.isSuperAdmin
      ? await prisma.organization.findMany({ orderBy: { createdAt: "asc" } })
      : (
          await prisma.membership.findMany({
            where: { userId: session.userId },
            include: { organization: true },
          })
        ).map((m) => m.organization);
    return NextResponse.json({ organizations: orgs });
  });
}

const createSchema = z.object({ name: z.string().min(2), brandColor: z.string().optional() });

// Create a new tenant (workspace) — used when you onboard a customer company.
export async function POST(req: NextRequest) {
  const body = await req.json();
  return withAuth(async (session) => {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    const slugBase = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
    let slug = slugBase;
    let i = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) slug = `${slugBase}-${i++}`;
    const org = await prisma.organization.create({
      data: {
        name: parsed.data.name,
        slug,
        brandColor: parsed.data.brandColor || "#3564fb",
        memberships: { create: { userId: session.userId, role: "owner" } },
      },
    });
    return NextResponse.json({ organization: org });
  });
}
