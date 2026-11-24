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

const INTERVAL_MS = 60_000;
const METRICS_INTERVAL_MS = 12 * 60 * 60 * 1000;

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

console.log("[worker] Bassir Social Pro scheduler started (publish 60s · metrics 12h)");
tick();
metricsTick();
setInterval(tick, INTERVAL_MS);
setInterval(metricsTick, METRICS_INTERVAL_MS);
