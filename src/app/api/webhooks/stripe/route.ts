import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { settleCheckoutSession } from "@/lib/invoices";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !secret) {
    return NextResponse.json({ error: "Stripe webhooks are not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await settleCheckoutSession(event.data.object);
      break;
    case "account.updated": {
      // Connect: keep each agency's "can take payments" flag in sync.
      const account = event.data.object;
      await db.agency.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeChargesEnabled: Boolean(account.charges_enabled) },
      });
      break;
    }
  }
  return NextResponse.json({ received: true });
}
