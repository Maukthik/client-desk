import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isConnectEnabled() {
  return process.env.STRIPE_CONNECT_ENABLED === "true";
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { appInfo: { name: "ClientDesk" } });
  return client;
}

/**
 * Whether an agency can take card payments right now. In single-account mode
 * that only needs a platform key; in Connect mode the agency must have finished
 * Stripe onboarding.
 */
export function canAcceptPayments(agency: { stripeAccountId: string | null; stripeChargesEnabled: boolean }) {
  if (!isStripeConfigured()) return false;
  if (!isConnectEnabled()) return true;
  return Boolean(agency.stripeAccountId && agency.stripeChargesEnabled);
}
