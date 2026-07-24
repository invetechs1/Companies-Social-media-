/**
 * Standalone scheduler worker.
 * Run with: npm run worker
 * Checks for due scheduled posts every 60 seconds and publishes them.
 * In production you can instead call GET /api/cron/publish from any cron
 * service (Vercel Cron, GitHub Actions, crontab) with the CRON_SECRET.
 */
import { publishDuePosts } from "../src/lib/publisher";

const INTERVAL_MS = 60_000;

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

console.log("[worker] SocialHub Pro scheduler started (interval: 60s)");
tick();
setInterval(tick, INTERVAL_MS);
