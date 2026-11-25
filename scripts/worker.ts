/**
 * Standalone scheduler worker.
 * Run with: npm run worker
 * - Checks for due scheduled posts every 60 seconds and publishes them.
 * - Syncs account analytics (followers / reach / engagement) every 12 hours.
 * In production you can instead call GET /api/cron/publish and
 * GET /api/cron/metrics from any cron service with the CRON_SECRET.
 */
import { publishDuePosts } from "../src/lib/publisher";
import { syncAllMetrics } from "../src/lib/metrics";
import { prisma } from "../src/lib/db";
import { sendReportEmail, isMailConfigured } from "../src/lib/mail";

const INTERVAL_MS = 60_000;
const METRICS_INTERVAL_MS = 12 * 60 * 60 * 1000;
const REPORTS_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function tick() {
  try {
    const results = await publishDuePosts();
    if (results.length > 0) {
      console.log(`[worker] ${new Date().toISOString()} published:`, results);
    }
  } catch (err) {
    console.error("[worker] error:", err);
  }
}

async function metricsTick() {
  try {
    const r = await syncAllMetrics();
    console.log(`[worker] ${new Date().toISOString()} metrics synced:`, r);
  } catch (err) {
    console.error("[worker] metrics error:", err);
  }
}

async function reportsTick() {
  if (!isMailConfigured()) return;
  try {
    const orgs = await prisma.organization.findMany({
      where: { reportFrequency: { in: ["weekly", "monthly"] }, reportEmail: { not: null } },
    });
    const now = Date.now();
    for (const org of orgs) {
      const minGapMs = (org.reportFrequency === "weekly" ? 7 : 28) * 86400e3;
      const last = org.reportLastSentAt?.getTime() ?? 0;
      if (now - last < minGapMs - 12 * 3600e3) continue;
      try {
        await sendReportEmail(org.id, org.reportFrequency === "weekly" ? 7 : 30);
        console.log(`[worker] report sent: ${org.name}`);
      } catch (err: any) {
        console.error(`[worker] report error (${org.name}):`, err?.message || err);
      }
    }
  } catch (err) {
    console.error("[worker] reports error:", err);
  }
}

console.log("[worker] Bassir Social Pro scheduler started (publish 60s · metrics 12h · reports 24h)");
tick();
metricsTick();
reportsTick();
setInterval(tick, INTERVAL_MS);
setInterval(metricsTick, METRICS_INTERVAL_MS);
setInterval(reportsTick, REPORTS_INTERVAL_MS);
