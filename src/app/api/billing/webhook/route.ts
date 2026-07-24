import { NextRequest, NextResponse } from "next/server";
import { stripe, applySubscriptionEvent } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook — Stripe webhook endpoint.
 * Configure in the Stripe dashboard with events:
 *   checkout.session.completed, customer.subscription.updated,
 *   customer.subscription.deleted, invoice.payment_failed
 * and set STRIPE_WEBHOOK_SECRET to the signing secret.
 */
export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Billing not configured" }, { status: 501 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  let event;
  try {
    if (secret) {
      const sig = req.headers.get("stripe-signature") || "";
      event = await stripe.webhooks.constructEventAsync(body, sig, secret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook verification failed: ${err.message}` }, { status: 400 });
  }

  await applySubscriptionEvent(event);
  return NextResponse.json({ received: true });
}
