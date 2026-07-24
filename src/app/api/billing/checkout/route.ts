import { NextRequest, NextResponse } from "next/server";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";
import { createCheckout, isBillingConfigured } from "@/lib/billing";

/** POST /api/billing/checkout  { orgId, plan } → { url } (Stripe Checkout) */
export async function POST(req: NextRequest) {
  const { orgId, plan } = await req.json();
  return withAuth(async (session) => {
    if (!isBillingConfigured())
      return jsonError("Billing is not configured. Set STRIPE_SECRET_KEY in .env.", 501);
    if (!orgId || !["starter", "pro", "enterprise"].includes(plan))
      return jsonError("orgId and a valid plan are required.");
    await requireOrgAccess(session.userId, orgId, "owner");
    try {
      const url = await createCheckout(orgId, plan, session.email);
      return NextResponse.json({ url });
    } catch (err: any) {
      return jsonError(String(err?.message || "Checkout failed"), 500);
    }
  });
}
