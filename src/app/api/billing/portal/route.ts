import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";
import { createPortal, isBillingConfigured } from "@/lib/billing";

/** POST /api/billing/portal  { orgId } → { url } (Stripe customer portal: invoices, cancel, cards) */
export async function POST(req: NextRequest) {
  const { orgId } = await req.json();
  return withAuth(async (session) => {
    if (!isBillingConfigured())
      return jsonError("Billing is not configured. Set STRIPE_SECRET_KEY in .env.", 501);
    if (!orgId) return jsonError("orgId is required.");
    await requireOrgAccess(session.userId, orgId, "owner");
    try {
      const url = await createPortal(orgId);
      return NextResponse.json({ url });
    } catch (err: any) {
      return jsonError(String(err?.message || "Portal failed"), 500);
    }
  });
}
