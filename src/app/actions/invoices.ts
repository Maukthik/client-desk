"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { invoiceScope, requireTeam, requireViewer } from "@/lib/dal";
import { fieldErrors, type FormState } from "@/lib/forms";
import { logActivity } from "@/lib/activity";
import { nextInvoiceNumber, settleCheckoutSession } from "@/lib/invoices";
import { sendMail } from "@/lib/mail";
import { computeInvoiceTotals, formatMoney, toMinorUnits } from "@/lib/money";
import { clientContactEmails } from "@/lib/notify";
import { canAcceptPayments, getStripe, isConnectEnabled } from "@/lib/stripe";
import { appUrl, formatDate, parseDateInput } from "@/lib/utils";
import * as v from "@/lib/validation";

const itemSchema = z.object({
  description: z.string().trim().min(1, "Describe each line item").max(500),
  quantity: z.coerce.number().positive("Quantity must be more than 0").max(1_000_000),
  unitPrice: z.coerce.number().min(0, "Price can't be negative").max(10_000_000),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Choose a client"),
  projectId: z.string().optional().transform((s) => s || null),
  issueDate: z.string().transform((s, ctx) => {
    const d = parseDateInput(s);
    if (!d) ctx.addIssue({ code: "custom", message: "Choose an issue date" });
    return d!;
  }),
  dueDate: z.string().transform((s, ctx) => {
    const d = parseDateInput(s);
    if (!d) ctx.addIssue({ code: "custom", message: "Choose a due date" });
    return d!;
  }),
  taxRate: z.coerce.number().min(0, "Tax can't be negative").max(100, "Tax must be 100% or less").default(0),
  notes: v.optionalText(2000),
  items: z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid line items" });
        return z.NEVER;
      }
    })
    .pipe(z.array(itemSchema).min(1, "Add at least one line item").max(100)),
  intent: z.enum(["draft", "send"]).default("draft"),
});

async function parseInvoice(formData: FormData, agencyId: string, currency: string) {
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) } as const;
  const data = parsed.data;
  if (data.dueDate < data.issueDate) return { errors: { dueDate: "Due date can't be before the issue date" } } as const;

  const client = await db.client.findFirst({ where: { id: data.clientId, agencyId } });
  if (!client) return { errors: { clientId: "Choose a client" } } as const;
  if (data.projectId) {
    const project = await db.project.findFirst({ where: { id: data.projectId, clientId: client.id } });
    if (!project) return { errors: { projectId: "That project belongs to a different client" } } as const;
  }

  const taxRate = Math.round(data.taxRate * 100); // percent -> basis points
  const items = data.items.map((item, position) => ({
    description: item.description,
    quantity: Math.round(item.quantity * 100) / 100,
    unitAmount: toMinorUnits(item.unitPrice, currency),
    position,
  }));
  const totals = computeInvoiceTotals(items, taxRate);
  if (totals.total <= 0) return { errors: { items: "The invoice total must be more than zero" } } as const;
  return { data, client, taxRate, items, totals } as const;
}

export async function createInvoice(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireTeam();
  const currency = viewer.agency.currency;
  const result = await parseInvoice(formData, viewer.agency.id, currency);
  if ("errors" in result) return { fieldErrors: result.errors };
  const { data, client, taxRate, items, totals } = result;

  const number = await nextInvoiceNumber(viewer.agency.id);
  const invoice = await db.invoice.create({
    data: {
      agencyId: viewer.agency.id,
      clientId: client.id,
      projectId: data.projectId,
      number,
      currency,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      notes: data.notes,
      taxRate,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      createdById: viewer.user.id,
      items: { create: items.map((item, i) => ({ ...item, amount: totals.lines[i]! })) },
    },
  });
  await logActivity({
    agencyId: viewer.agency.id,
    actorId: viewer.user.id,
    projectId: invoice.projectId,
    message: `${viewer.user.name} drafted invoice ${number} for ${client.name}`,
    href: `/invoices/${invoice.id}`,
  });
  if (data.intent === "send") await deliverInvoice(invoice.id, viewer.agency.id, viewer.user);
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireTeam();
  const id = String(formData.get("invoiceId"));
  const existing = await db.invoice.findFirst({ where: { id, agencyId: viewer.agency.id } });
  if (!existing) return { error: "Invoice not found." };
  if (existing.status !== "DRAFT") return { error: "Only draft invoices can be edited." };

  const result = await parseInvoice(formData, viewer.agency.id, existing.currency);
  if ("errors" in result) return { fieldErrors: result.errors };
  const { data, client, taxRate, items, totals } = result;

  await db.$transaction([
    db.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    db.invoice.update({
      where: { id },
      data: {
        clientId: client.id,
        projectId: data.projectId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        notes: data.notes,
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        items: { create: items.map((item, i) => ({ ...item, amount: totals.lines[i]! })) },
      },
    }),
  ]);
  if (data.intent === "send") await deliverInvoice(id, viewer.agency.id, viewer.user);
  redirect(`/invoices/${id}`);
}

/** DRAFT -> OPEN, and email the client's portal users plus billing address. */
async function deliverInvoice(invoiceId: string, agencyId: string, actor: { id: string; name: string }) {
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, agencyId }, include: { client: true, agency: true } });
  if (!invoice || invoice.status !== "DRAFT") return;
  await db.invoice.update({ where: { id: invoice.id }, data: { status: "OPEN", sentAt: new Date() } });

  const amount = formatMoney(invoice.total, invoice.currency);
  const recipients = new Set(await clientContactEmails(invoice.clientId));
  if (invoice.client.email) recipients.add(invoice.client.email);
  await sendMail({
    to: [...recipients],
    subject: `Invoice ${invoice.number} from ${invoice.agency.name} — ${amount}`,
    heading: `Invoice ${invoice.number}`,
    body: [
      `${invoice.agency.name} sent you an invoice for ${amount}, due ${formatDate(invoice.dueDate)}.`,
      canAcceptPayments(invoice.agency) ? "You can view the invoice and pay securely by card in your portal." : "You can view the invoice in your portal.",
    ],
    cta: { label: "View invoice", href: appUrl(`/invoices/${invoice.id}`) },
  });
  await logActivity({
    agencyId,
    actorId: actor.id,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    message: `${actor.name} sent invoice ${invoice.number} (${amount})`,
    href: `/invoices/${invoice.id}`,
  });
}

export async function sendInvoice(formData: FormData) {
  const viewer = await requireTeam();
  const id = String(formData.get("invoiceId"));
  await deliverInvoice(id, viewer.agency.id, viewer.user);
  revalidatePath(`/invoices/${id}`);
}

const markPaidSchema = z.object({
  invoiceId: z.string().min(1),
  method: z.enum(["bank_transfer", "check", "cash", "other"]),
});

/** Records a payment received outside Stripe. */
export async function markInvoicePaid(formData: FormData) {
  const viewer = await requireTeam();
  const { invoiceId, method } = markPaidSchema.parse(Object.fromEntries(formData));
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, agencyId: viewer.agency.id, status: "OPEN" }, include: { client: true } });
  if (!invoice) return;
  await db.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date(), paymentMethod: method } });
  await logActivity({
    agencyId: viewer.agency.id,
    actorId: viewer.user.id,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    message: `${viewer.user.name} marked invoice ${invoice.number} as paid`,
    href: `/invoices/${invoice.id}`,
  });
  revalidatePath(`/invoices/${invoice.id}`);
}

export async function voidInvoice(formData: FormData) {
  const viewer = await requireTeam();
  const id = String(formData.get("invoiceId"));
  const { count } = await db.invoice.updateMany({ where: { id, agencyId: viewer.agency.id, status: "OPEN" }, data: { status: "VOID" } });
  if (count) {
    const invoice = await db.invoice.findUniqueOrThrow({ where: { id } });
    await logActivity({
      agencyId: viewer.agency.id,
      actorId: viewer.user.id,
      clientId: invoice.clientId,
      message: `${viewer.user.name} voided invoice ${invoice.number}`,
      href: `/invoices/${id}`,
    });
  }
  revalidatePath(`/invoices/${id}`);
}

export async function deleteInvoice(formData: FormData) {
  const viewer = await requireTeam();
  const id = String(formData.get("invoiceId"));
  await db.invoice.deleteMany({ where: { id, agencyId: viewer.agency.id, status: "DRAFT" } });
  redirect("/invoices");
}

/** Client: start (or resume) a Stripe Checkout session for an open invoice. */
export async function payInvoice(formData: FormData) {
  const viewer = await requireViewer();
  const id = String(formData.get("invoiceId"));
  const invoice = await db.invoice.findFirst({
    where: { ...invoiceScope(viewer), id, status: "OPEN" },
    include: { agency: true, client: true },
  });
  if (!invoice || !canAcceptPayments(invoice.agency)) redirect(`/invoices/${id}`);

  // redirect() works by throwing, so decide the destination inside the try and
  // redirect after it.
  let destinationUrl: string;
  try {
    destinationUrl = await checkoutUrlFor(invoice, viewer.user.email);
  } catch (error) {
    console.error("Stripe checkout failed", error);
    destinationUrl = `/invoices/${id}?checkout=error`;
  }
  redirect(destinationUrl);
}

async function checkoutUrlFor(invoice: Prisma.InvoiceGetPayload<{ include: { agency: true; client: true } }>, email: string) {
  const stripe = getStripe();

  // Reuse an in-progress session so a double click can't create two payments.
  if (invoice.stripeCheckoutSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(invoice.stripeCheckoutSessionId);
    if (existing.status === "open" && existing.url) return existing.url;
    if (existing.status === "complete") {
      await settleCheckoutSession(existing);
      return `/invoices/${invoice.id}?checkout=success`;
    }
  }

  const destination = isConnectEnabled() ? invoice.agency.stripeAccountId : null;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: invoice.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: invoice.currency,
          unit_amount: invoice.total,
          product_data: { name: `Invoice ${invoice.number}`, description: `${invoice.agency.name} · ${invoice.client.name}` },
        },
      },
    ],
    metadata: { invoiceId: invoice.id, agencyId: invoice.agencyId },
    payment_intent_data: {
      description: `${invoice.agency.name} invoice ${invoice.number}`,
      metadata: { invoiceId: invoice.id, agencyId: invoice.agencyId },
      ...(destination ? { on_behalf_of: destination, transfer_data: { destination } } : {}),
    },
    success_url: appUrl(`/invoices/${invoice.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`),
    cancel_url: appUrl(`/invoices/${invoice.id}?checkout=cancelled`),
  });
  await db.invoice.update({ where: { id: invoice.id }, data: { stripeCheckoutSessionId: session.id } });
  return session.url!;
}
