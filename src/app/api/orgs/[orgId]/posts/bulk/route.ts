import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";
import { isSafeMediaRef } from "@/lib/safeUrl";

/**
 * POST /api/orgs/:orgId/posts/bulk
 * Create many scheduled posts at once (CSV bulk upload). Each row targets the
 * workspace's accounts on the given platforms.
 */
const rowSchema = z.object({
  body: z.string().min(1),
  scheduledAt: z.string().datetime().nullable().optional(),
  providers: z.array(z.string()).min(1), // platform keys: facebook, instagram, ...
  // http(s) URL or one of this app's own /uploads paths — nothing else is fetched/published.
  mediaUrl: z.string().refine(isSafeMediaRef, "mediaUrl must be an http(s) URL or an /uploads path").optional(),
});
const schema = z.object({ posts: z.array(rowSchema).min(1).max(200) });

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const raw = await req.json();
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "editor");
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);

    const accounts = await prisma.socialAccount.findMany({
      where: { organizationId: params.orgId },
      select: { id: true, provider: true },
    });
    const byProvider = new Map<string, string[]>();
    for (const a of accounts) {
      const list = byProvider.get(a.provider) || [];
      list.push(a.id);
      byProvider.set(a.provider, list);
    }

    let created = 0;
    const errors: { row: number; error: string }[] = [];
    for (let i = 0; i < parsed.data.posts.length; i++) {
      const row = parsed.data.posts[i];
      const accountIds = Array.from(
        new Set(row.providers.flatMap((p) => byProvider.get(p.toLowerCase().trim()) || []))
      );
      if (accountIds.length === 0) {
        errors.push({ row: i + 1, error: `No connected account for: ${row.providers.join(", ")}` });
        continue;
      }
      try {
        await prisma.post.create({
          data: {
            body: row.body,
            mediaUrls: JSON.stringify(row.mediaUrl ? [row.mediaUrl] : []),
            status: row.scheduledAt ? "scheduled" : "draft",
            scheduledAt: row.scheduledAt ? new Date(row.scheduledAt) : null,
            organizationId: params.orgId,
            authorId: session.userId,
            targets: { create: accountIds.map((id) => ({ socialAccountId: id })) },
          },
        });
        created++;
      } catch (err: any) {
        errors.push({ row: i + 1, error: String(err?.message || err) });
      }
    }
    return NextResponse.json({ ok: true, created, errors });
  });
}
