import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendReportEmail, isMailConfigured } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reports
 * Sends scheduled performance reports to tenants whose cadence is due.
 * Weekly reports send once every ~7 days, monthly once every ~28 days —
 * so hitting this daily (with CRON_SECRET) delivers each on time without
 * duplicates. Protect with Authorization: Bearer <CRON_SECRET> or ?secret=.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.nextUrl.searchParams.get("secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json({ ok: false, error: "Email not configured" }, { status: 501 });
  }

  const orgs = await prisma.organization.findMany({
    where: { reportFrequency: { in: ["weekly", "monthly"] }, reportEmail: { not: null } },
  });

  const now = Date.now();
  let sent = 0;
  const results: { org: string; status: string }[] = [];
  for (const org of orgs) {
    const minGapMs = (org.reportFrequency === "weekly" ? 7 : 28) * 86400e3;
    const last = org.reportLastSentAt?.getTime() ?? 0;
    // Allow a small slack so a daily cron doesn't skip a day on the boundary.
    if (now - last < minGapMs - 12 * 3600e3) {
      results.push({ org: org.name, status: "not_due" });
      continue;
    }
    try {
      await sendReportEmail(org.id, org.reportFrequency === "weekly" ? 7 : 30);
      sent++;
      results.push({ org: org.name, status: "sent" });
    } catch (err: any) {
      results.push({ org: org.name, status: `error: ${err?.message || err}` });
    }
  }
  return NextResponse.json({ ok: true, sent, results });
}
