import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";

const patchSchema = z.object({
  body: z.string().min(1).optional(),
  mediaUrls: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "scheduled"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { postId: string } }) {
  const raw = await req.json();
  return withAuth(async (session) => {
    const post = await prisma.post.findUnique({ where: { id: params.postId } });
    if (!post) return jsonError("Post not found", 404);
    await requireOrgAccess(session.userId, post.organizationId, "editor");
    if (["published", "publishing"].includes(post.status))
      return jsonError("Published posts cannot be edited.");
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    const { mediaUrls, scheduledAt, ...rest } = parsed.data;
    const updated = await prisma.post.update({
      where: { id: params.postId },
      data: {
        ...rest,
        ...(mediaUrls !== undefined ? { mediaUrls: JSON.stringify(mediaUrls) } : {}),
        ...(scheduledAt !== undefined
          ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }
          : {}),
      },
    });
    return NextResponse.json({ post: updated });
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { postId: string } }) {
  return withAuth(async (session) => {
    const post = await prisma.post.findUnique({ where: { id: params.postId } });
    if (!post) return jsonError("Post not found", 404);
    await requireOrgAccess(session.userId, post.organizationId, "editor");
    await prisma.post.delete({ where: { id: params.postId } });
    return NextResponse.json({ ok: true });
  });
}
