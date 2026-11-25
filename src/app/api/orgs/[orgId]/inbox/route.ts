import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";
import { fetchInbox, replyInInbox } from "@/lib/inbox";

/** GET /api/orgs/:orgId/inbox — recent comments on published FB/IG posts. */
export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId);
    const items = await fetchInbox(params.orgId);
    return NextResponse.json({ items });
  });
}

const replySchema = z.object({
  accountId: z.string(),
  commentId: z.string(),
  message: z.string().min(1, "Write a reply first."),
});

/** POST /api/orgs/:orgId/inbox — reply to a comment (editors+). */
export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const raw = await req.json();
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "editor");
    const parsed = replySchema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    // Ensure the account belongs to this workspace.
    const account = await prisma.socialAccount.findFirst({
      where: { id: parsed.data.accountId, organizationId: params.orgId },
    });
    if (!account) return jsonError("Account not found in this workspace.", 404);
    try {
      await replyInInbox(parsed.data.accountId, parsed.data.commentId, parsed.data.message);
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      return jsonError(String(err?.message || "Reply failed"), 500);
    }
  });
}
