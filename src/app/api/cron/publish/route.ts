import { NextRequest, NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/publisher";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/publish
 * Publishes every scheduled post whose time has arrived.
 * Protect with CRON_SECRET: call with Authorization: Bearer <CRON_SECRET>
 * or ?secret=<CRON_SECRET>. Hook this to Vercel Cron / crontab / any scheduler.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.nextUrl.searchParams.get("secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await publishDuePosts();
  return NextResponse.json({ published: results.length, results });
}
