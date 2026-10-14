import "server-only";
import type Stripe from "stripe";
import { db } from "./db";
import { logActivity } from "./activity";
import { sendMail } from "./mail";
import { formatMoney } from "./money";
import { appUrl } from "./utils";

/** Allocates the next invoice number for an agency atomically. */
export async function nextInvoiceNumber(agencyId: string) {
  const agency = await db.agency.update({
    where: { id: agencyId },
    data: { nextInvoiceNumber: { increment: 1 } },
    select: { invoicePrefix: true, nextInvoiceNumber: true },
  });
  return `${agency.invoicePrefix}-${agency.nextInvoiceNumber - 1}`;
}

export function isOverdue(invoice: { status: string; dueDate: Date }, now = new Date()) {
  return invoice.status === "OPEN" && invoice.dueDate < now;
}

/**
 * Marks an invoice paid from a completed Stripe Checkout Session. Called from
 * both the webhook and the post-checkout redirect, so it must be idempotent.
 */
export async function settleCheckoutSession(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId;
  if (!invoiceId || session.payment_status !== "paid") return false;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  // Only transition OPEN -> PAID once; a concurrent webhook + redirect race is
  // resolved by the conditional update.
  const { count } = await db.invoice.updateMany({
    where: { id: invoiceId, status: "OPEN" },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentMethod: "stripe",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    },
  });
  if (count === 0) return false;

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true, agency: { include: { memberships: { where: { role: "OWNER" }, include: { user: true } } } } },
  });
  const amount = formatMoney(invoice.total, invoice.currency);
  await logActivity({
    agencyId: invoice.agencyId,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    message: `${invoice.client.name} paid invoice ${invoice.number} (${amount})`,
    href: `/invoices/${invoice.id}`,
  });
  await sendMail({
    to: invoice.agency.memberships.map((m) => m.user.email),
    subject: `Payment received: ${invoice.number} (${amount})`,
    heading: "You got paid",
    body: [`${invoice.client.name} paid invoice ${invoice.number} for ${amount} by card.`],
    cta: { label: "View invoice", href: appUrl(`/invoices/${invoice.id}`) },
  });
  return true;
}
