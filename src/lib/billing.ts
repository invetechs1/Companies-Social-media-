import Stripe from "stripe";
import { prisma } from "./db";

/**
 * Stripe billing for tenant subscriptions.
 * Configure STRIPE_SECRET_KEY + price IDs in .env; everything degrades
 * gracefully when unset (billing UI shows "not configured").
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const isBillingConfigured = () => !!stripe;

export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

const APP_URL = process.env.APP_URL || "http://localhost:3000";

/** Get or create the Stripe customer for an organization. */
export async function ensureCustomer(orgId: string, email: string) {
  if (!stripe) throw new Error("Billing not configured");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe.customers.create({
    email,
    name: org.name,
    metadata: { orgId },
  });
  await prisma.organization.update({
    where: { id: orgId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/** Create a subscription checkout session for a plan; returns the redirect URL. */
export async function createCheckout(orgId: string, plan: string, email: string) {
  if (!stripe) throw new Error("Billing not configured");
  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) throw new Error(`No Stripe price configured for plan "${plan}"`);
  const customerId = await ensureCustomer(orgId, email);
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { orgId, plan } },
    metadata: { orgId, plan },
    success_url: `${APP_URL}/dashboard/${orgId}/settings?billing=success`,
    cancel_url: `${APP_URL}/dashboard/${orgId}/settings?billing=cancelled`,
  });
  return session.url!;
}

/** Create a Stripe customer-portal session (invoices, payment methods, cancel). */
export async function createPortal(orgId: string) {
  if (!stripe) throw new Error("Billing not configured");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!org.stripeCustomerId) throw new Error("No billing account yet — subscribe to a plan first.");
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${APP_URL}/dashboard/${orgId}/settings`,
  });
  return session.url;
}

/** Apply a webhook event to the tenant's plan/status. */
export async function applySubscriptionEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orgId = s.metadata?.orgId;
      if (!orgId) return;
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: s.metadata?.plan || undefined,
          planStatus: "active",
          stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : undefined,
        },
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.orgId;
      if (!orgId) return;
      const status =
        sub.status === "active" || sub.status === "trialing"
          ? "active"
          : sub.status === "past_due" || sub.status === "unpaid"
            ? "suspended"
            : sub.status === "canceled"
              ? "suspended"
              : undefined;
      if (status) {
        await prisma.organization.update({
          where: { id: orgId },
          data: { planStatus: status, plan: sub.metadata?.plan || undefined },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.orgId;
      if (!orgId) return;
      await prisma.organization.update({
        where: { id: orgId },
        data: { planStatus: "suspended", stripeSubscriptionId: null },
      });
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      if (!customerId) return;
      await prisma.organization.updateMany({
        where: { stripeCustomerId: customerId },
        data: { planStatus: "suspended" },
      });
      break;
    }
  }
}
