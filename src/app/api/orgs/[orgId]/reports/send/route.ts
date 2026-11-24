import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";
import { sendReportEmail, isMailConfigured } from "@/lib/mail";

const schema = z.object({
  days: z.number().optional(),
  to: z.string().email().optional(),
});

/** POST /api/orgs/:orgId/reports/send — email the performance report now (admins+). */
export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const raw = await req.json().catch(() => ({}));
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "admin");
    if (!isMailConfigured())
      return jsonError("Email is not configured. Set SMTP_* in .env.", 501);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    try {
      const r = await sendReportEmail(params.orgId, parsed.data.days || 30, parsed.data.to);
      return NextResponse.json({ ok: true, ...r });
    } catch (err: any) {
      return jsonError(String(err?.message || "Failed to send report"), 500);
    }
  });
}
