import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId);
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const posts = await prisma.post.findMany({
      where: { organizationId: params.orgId, ...(status ? { status } : {}) },
      include: {
        author: { select: { name: true } },
        targets: { include: { socialAccount: { select: { provider: true, displayName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ posts });
  });
}

const createSchema = z.object({
  body: z.string().min(1, "Post text is required"),
  mediaUrls: z.array(z.string()).default([]),
  socialAccountIds: z.array(z.string()).min(1, "Select at least one social account"),
  scheduledAt: z.string().datetime().nullable().optional(),
  requestApproval: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const raw = await req.json();
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "editor");
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    const { body, mediaUrls, socialAccountIds, scheduledAt, requestApproval } = parsed.data;

    // Ensure all target accounts belong to this org
    const accounts = await prisma.socialAccount.findMany({
      where: { id: { in: socialAccountIds }, organizationId: params.orgId },
    });
    if (accounts.length !== socialAccountIds.length)
      return jsonError("One or more social accounts are invalid.");

    const status = requestApproval
      ? "pending_approval"
      : scheduledAt
        ? "scheduled"
        : "draft";

    const post = await prisma.post.create({
      data: {
        body,
        mediaUrls: JSON.stringify(mediaUrls),
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        organizationId: params.orgId,
        authorId: session.userId,
        targets: { create: socialAccountIds.map((id) => ({ socialAccountId: id })) },
      },
    });
    if (requestApproval) {
      await prisma.approvalEvent.create({
        data: { postId: post.id, actorId: session.userId, action: "submitted" },
      });
    }
    return NextResponse.json({ post });
  });
}
