import { prisma } from "./db";
import { PROVIDER_META } from "./ui";

/**
 * Builds a branded performance report for one workspace over a window of days,
 * and renders it to self-contained HTML (used by the report page and the
 * scheduled email). No external assets so it prints and emails cleanly.
 */

export interface ReportData {
  org: { name: string; brandColor: string; logoUrl: string | null };
  periodDays: number;
  from: Date;
  to: Date;
  totals: { followers: number; followerDelta: number; impressions: number; engagements: number; published: number };
  accounts: {
    provider: string;
    displayName: string;
    followers: number;
    delta: number;
    impressions: number;
    engagements: number;
  }[];
  topPosts: { body: string; publishedAt: Date | null; providers: string[] }[];
}

export async function buildReportData(organizationId: string, periodDays = 30): Promise<ReportData | null> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return null;

  const to = new Date();
  const from = new Date(to.getTime() - periodDays * 86400e3);

  const accounts = await prisma.socialAccount.findMany({
    where: { organizationId },
    include: {
      metrics: { orderBy: { capturedAt: "desc" }, take: 60 },
    },
    orderBy: { createdAt: "asc" },
  });

  const accountRows = accounts.map((a) => {
    const inWindow = a.metrics.filter((m) => m.capturedAt >= from);
    const latest = a.metrics[0];
    // Earliest snapshot still inside the window (fallback to oldest we have).
    const earliest = inWindow[inWindow.length - 1] || a.metrics[a.metrics.length - 1];
    return {
      provider: a.provider,
      displayName: a.displayName,
      followers: latest?.followers ?? 0,
      delta: (latest?.followers ?? 0) - (earliest?.followers ?? latest?.followers ?? 0),
      impressions: latest?.impressions ?? 0,
      engagements: latest?.engagements ?? 0,
    };
  });

  const publishedTargets = await prisma.postTarget.findMany({
    where: {
      status: "published",
      publishedAt: { gte: from },
      socialAccount: { organizationId },
    },
    include: {
      post: { select: { body: true, publishedAt: true } },
      socialAccount: { select: { provider: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  // Group targets back into posts for the "top posts" list.
  const byPost = new Map<string, { body: string; publishedAt: Date | null; providers: Set<string> }>();
  for (const t of publishedTargets) {
    const key = t.post.body + String(t.post.publishedAt);
    if (!byPost.has(key)) byPost.set(key, { body: t.post.body, publishedAt: t.publishedAt, providers: new Set() });
    byPost.get(key)!.providers.add(t.socialAccount.provider);
  }
  const topPosts = Array.from(byPost.values())
    .slice(0, 5)
    .map((p) => ({ body: p.body, publishedAt: p.publishedAt, providers: Array.from(p.providers) }));

  return {
    org: { name: org.name, brandColor: org.brandColor, logoUrl: org.logoUrl },
    periodDays,
    from,
    to,
    totals: {
      followers: accountRows.reduce((s, a) => s + a.followers, 0),
      followerDelta: accountRows.reduce((s, a) => s + a.delta, 0),
      impressions: accountRows.reduce((s, a) => s + a.impressions, 0),
      engagements: accountRows.reduce((s, a) => s + a.engagements, 0),
      published: byPost.size,
    },
    accounts: accountRows,
    topPosts,
  };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const n = (x: number) => x.toLocaleString();
const fmt = (d: Date) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/** Renders the report to standalone HTML (inline styles so it emails/prints cleanly). */
export function renderReportHtml(r: ReportData): string {
  const c = r.org.brandColor;
  const stat = (label: string, value: string, sub = "") => `
    <td style="padding:14px 16px;background:#f8fafc;border-radius:10px;vertical-align:top">
      <div style="font-size:22px;font-weight:800;color:#0f172a">${value}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">${label}</div>
      ${sub ? `<div style="font-size:11px;color:${c};margin-top:4px">${sub}</div>` : ""}
    </td>`;

  const accountRows = r.accounts
    .map((a) => {
      const meta = PROVIDER_META[a.provider];
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eef2f7">${meta?.icon || ""} ${esc(a.displayName)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eef2f7;text-align:right">${n(a.followers)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eef2f7;text-align:right;color:${a.delta >= 0 ? "#0e7a4f" : "#b3261e"}">${a.delta >= 0 ? "+" : ""}${n(a.delta)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eef2f7;text-align:right">${n(a.impressions)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eef2f7;text-align:right">${n(a.engagements)}</td>
      </tr>`;
    })
    .join("");

  const postRows = r.topPosts.length
    ? r.topPosts
        .map(
          (p) => `<li style="padding:8px 0;border-bottom:1px solid #eef2f7;font-size:13px;color:#334155">
            ${esc(p.body.slice(0, 120))}${p.body.length > 120 ? "…" : ""}
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${p.providers.map((x) => PROVIDER_META[x]?.icon || "").join(" ")} ${p.publishedAt ? fmt(p.publishedAt) : ""}</div>
          </li>`
        )
        .join("")
    : `<li style="padding:8px 0;color:#94a3b8;font-size:13px">No posts published in this period.</li>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.org.name)} — Performance report</title></head>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a">
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:${c};padding:24px 28px;color:#fff">
        <div style="display:flex;align-items:center;gap:10px">
          ${r.org.logoUrl ? `<img src="${esc(r.org.logoUrl)}" alt="" style="height:36px;border-radius:8px">` : ""}
          <div>
            <div style="font-size:20px;font-weight:800">${esc(r.org.name)}</div>
            <div style="font-size:13px;opacity:.9">Social performance report</div>
          </div>
        </div>
        <div style="font-size:12px;opacity:.85;margin-top:10px">${fmt(r.from)} – ${fmt(r.to)} · last ${r.periodDays} days</div>
      </div>
      <div style="padding:22px 28px">
        <table width="100%" cellspacing="8" cellpadding="0" style="border-collapse:separate"><tr>
          ${stat("Total followers", n(r.totals.followers), `${r.totals.followerDelta >= 0 ? "▲" : "▼"} ${n(Math.abs(r.totals.followerDelta))} this period`)}
          ${stat("Impressions", n(r.totals.impressions))}
        </tr><tr>
          ${stat("Engagements", n(r.totals.engagements))}
          ${stat("Posts published", n(r.totals.published))}
        </tr></table>

        <h3 style="font-size:14px;margin:24px 0 8px">By account</h3>
        <table width="100%" style="border-collapse:collapse;font-size:13px">
          <thead><tr style="color:#64748b;font-size:11px;text-align:right">
            <th style="text-align:left;padding:6px 8px">Account</th><th style="padding:6px 8px">Followers</th>
            <th style="padding:6px 8px">Δ</th><th style="padding:6px 8px">Impr.</th><th style="padding:6px 8px">Eng.</th>
          </tr></thead>
          <tbody>${accountRows || `<tr><td colspan="5" style="padding:10px;color:#94a3b8">No connected accounts.</td></tr>`}</tbody>
        </table>

        <h3 style="font-size:14px;margin:24px 0 8px">Recent posts</h3>
        <ul style="list-style:none;padding:0;margin:0">${postRows}</ul>
      </div>
      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
        Generated by ${esc(r.org.name)} · powered by Bassir Social Pro
      </div>
    </div>
  </div>
</body></html>`;
}
