import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId);
    const members = await prisma.membership.findMany({
      where: { organizationId: params.orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ members });
  });
}

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "editor", "viewer"]),
});

/** Add a team member (creates the user if they don't exist yet). */
export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const raw = await req.json();
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "admin");
    const parsed = inviteSchema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    const { name, email, password, role } = parsed.data;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { name, email, passwordHash: await bcrypt.hash(password, 10) },
      });
    }
    const existing = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: params.orgId } },
    });
    if (existing) return jsonError("This user is already a member.", 409);

    const membership = await prisma.membership.create({
      data: { userId: user.id, organizationId: params.orgId, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ member: membership });
  });
}
