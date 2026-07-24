import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";
import { publishPost } from "@/lib/publisher";

/**
 * POST /api/posts/:id/actions  { action: "approve" | "reject" | "publish_now" | "submit", note? }
 */
export async function POST(req: NextRequest, { params }: { params: { postId: string } }) {
  const { action, note } = await req.json();
  return withAuth(async (session) => {
    const post = await prisma.post.findUnique({ where: { id: params.postId } });
    if (!post) return jsonError("Post not found", 404);

    switch (action) {
      case "submit": {
        await requireOrgAccess(session.userId, post.organizationId, "editor");
        await prisma.post.update({ where: { id: post.id }, data: { status: "pending_approval" } });
        await prisma.approvalEvent.create({
          data: { postId: post.id, actorId: session.userId, action: "submitted", note },
        });
        return NextResponse.json({ ok: true });
      }
      case "approve": {
        await requireOrgAccess(session.userId, post.organizationId, "admin");
        const next = post.scheduledAt ? "scheduled" : "approved";
        await prisma.post.update({ where: { id: post.id }, data: { status: next } });
        await prisma.approvalEvent.create({
          data: { postId: post.id, actorId: session.userId, action: "approved", note },
        });
        return NextResponse.json({ ok: true, status: next });
      }
      case "reject": {
        await requireOrgAccess(session.userId, post.organizationId, "admin");
        await prisma.post.update({ where: { id: post.id }, data: { status: "draft" } });
        await prisma.approvalEvent.create({
          data: { postId: post.id, actorId: session.userId, action: "rejected", note },
        });
        return NextResponse.json({ ok: true });
      }
      case "publish_now": {
        await requireOrgAccess(session.userId, post.organizationId, "editor");
        if (post.status === "pending_approval")
          return jsonError("This post is awaiting approval.");
        const result = await publishPost(post.id);
        return NextResponse.json({ ok: true, ...result });
      }
      default:
        return jsonError("Unknown action");
    }
  });
}
