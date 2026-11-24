import { NextRequest, NextResponse } from "next/server";
import { syncAllMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/metrics
 * Pulls fresh followers / reach / engagement for every connected account and
 * stores a daily MetricSnapshot (feeds the Analytics & Activity dashboards).
 * Protect with CRON_SECRET: Authorization: Bearer <CRON_SECRET> or ?secret=...
 * Schedule it once or twice a day (Vercel Cron / crontab / the worker).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.nextUrl.searchParams.get("secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAllMetrics();
  return NextResponse.json({ ok: true, ...result });
}
