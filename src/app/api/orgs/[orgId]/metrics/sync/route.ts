import { NextRequest, NextResponse } from "next/server";
import { withAuth, requireOrgAccess } from "@/lib/api";
import { syncAllMetrics } from "@/lib/metrics";

/**
 * POST /api/orgs/:orgId/metrics/sync
 * Manually pull fresh analytics for this workspace's accounts ("Refresh now").
 * Editors+ can trigger it; also used by the mobile app.
 */
export async function POST(_req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "editor");
    const result = await syncAllMetrics(params.orgId);
    return NextResponse.json({ ok: true, ...result });
  });
}
