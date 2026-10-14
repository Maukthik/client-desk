import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CreditCard, Lock, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { deleteInvoice, markInvoicePaid, payInvoice, sendInvoice, voidInvoice } from "@/app/actions/invoices";
import { PrintButton } from "@/components/invoices/print-button";
import { InvoiceBadge } from "@/components/status-badges";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormAlert, Select } from "@/components/ui/form";
import { DescriptionList, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { invoiceScope, requireViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { settleCheckoutSession } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";
import { canAcceptPayments, getStripe } from "@/lib/stripe";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice" };

const METHOD_LABEL: Record<string, string> = {
  stripe: "Card (Stripe)",
  bank_transfer: "Bank transfer",
  check: "Check",
  cash: "Cash",
  other: "Other",
};

export default async function InvoicePage({ params, searchParams }: PageProps<"/invoices/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const { checkout, session_id } = await searchParams;

  const find = () =>
    db.invoice.findFirst({
      where: { ...invoiceScope(viewer), id },
      include: { client: true, project: true, agency: true, items: { orderBy: { position: "asc" } } },
    });
  let invoice = await find();
  if (!invoice) notFound();

  // Returning from Stripe Checkout: confirm the payment right away instead of
  // waiting for the webhook. settleCheckoutSession is idempotent.
  if (checkout === "success" && typeof session_id === "string" && invoice.status === "OPEN") {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      if (session.metadata?.invoiceId === invoice.id && (await settleCheckoutSession(session))) invoice = (await find())!;
    } catch (error) {
      console.error("Could not verify checkout session", error);
    }
  }

  const amountDue = invoice.status === "OPEN" ? invoice.total : 0;
  const payable = invoice.status === "OPEN" && canAcceptPayments(invoice.agency);

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/invoices" className="hover:text-zinc-800">← Invoices</Link>}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {invoice.number}
            <InvoiceBadge status={invoice.status} dueDate={invoice.dueDate} />
          </span>
        }
        description={`${invoice.client.name} · ${formatMoney(invoice.total, invoice.currency)}`}
        actions={
          <>
            <PrintButton />
            {viewer.isTeam && invoice.status === "DRAFT" && (
              <ButtonLink href={`/invoices/${invoice.id}/edit`} variant="secondary">
                <Pencil /> Edit
              </ButtonLink>
            )}
          </>
        }
      />

      {checkout === "success" && invoice.status === "PAID" && (
        <div className="mb-6"><FormAlert tone="success" message="Payment received — thank you! A receipt has been emailed to you by Stripe." /></div>
      )}
      {checkout === "success" && invoice.status === "OPEN" && (
        <div className="mb-6"><FormAlert tone="success" message="Thanks! Your payment is processing and this invoice will update shortly." /></div>
      )}
      {checkout === "cancelled" && <div className="mb-6"><FormAlert message="Payment was cancelled. You haven't been charged." /></div>}
      {checkout === "error" && invoice.status === "OPEN" && (
        <div className="mb-6"><FormAlert message="We couldn't start the payment. Please try again in a moment, or contact us if it keeps happening." /></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="print-area overflow-hidden lg:col-span-2">
          <div className="border-b border-zinc-100 px-6 py-8 sm:px-10">
            <div className="flex flex-col justify-between gap-6 sm:flex-row">
              <div>
                <p className="text-lg font-semibold">{invoice.agency.name}</p>
                <p className="mt-6 text-xs font-medium tracking-wide text-zinc-400 uppercase">Bill to</p>
                <p className="mt-1 font-medium">{invoice.client.name}</p>
                {invoice.client.email && <p className="text-sm text-zinc-500">{invoice.client.email}</p>}
              </div>
              <div className="sm:text-right">
                <p className="text-2xl font-semibold tracking-tight text-zinc-400">INVOICE</p>
                <dl className="mt-4 grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm sm:justify-end">
                  <dt className="text-zinc-500">Number</dt>
                  <dd className="font-medium">{invoice.number}</dd>
                  <dt className="text-zinc-500">Issued</dt>
                  <dd>{formatDate(invoice.issueDate)}</dd>
                  <dt className="text-zinc-500">Due</dt>
                  <dd>{formatDate(invoice.dueDate)}</dd>
                  {invoice.project && (
                    <>
                      <dt className="text-zinc-500">Project</dt>
                      <dd>{invoice.project.name}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto px-6 sm:px-10">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs tracking-wide text-zinc-500 uppercase">
                  <th className="py-3 font-medium">Description</th>
                  <th className="py-3 text-right font-medium">Qty</th>
                  <th className="py-3 text-right font-medium">Unit price</th>
                  <th className="py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4">{item.description}</td>
                    <td className="py-3 text-right tabular-nums">{Number(item.quantity)}</td>
                    <td className="py-3 text-right tabular-nums">{formatMoney(item.unitAmount, invoice.currency)}</td>
                    <td className="py-3 text-right font-medium tabular-nums">{formatMoney(item.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-8 px-6 py-8 sm:flex-row sm:justify-between sm:px-10">
            <div className="max-w-sm text-sm whitespace-pre-line text-zinc-600">
              {invoice.notes && (
                <>
                  <p className="mb-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">Notes</p>
                  {invoice.notes}
                </>
              )}
            </div>
            <dl className="w-full space-y-2 text-sm sm:w-64">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(invoice.subtotal, invoice.currency)}</dd>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Tax ({invoice.taxRate / 100}%)</dt>
                  <dd className="tabular-nums">{formatMoney(invoice.tax, invoice.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(invoice.total, invoice.currency)}</dd>
              </div>
              <div className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 font-semibold">
                <dt>Amount due</dt>
                <dd className="tabular-nums">{formatMoney(amountDue, invoice.currency)}</dd>
              </div>
            </dl>
          </div>
        </Card>

        <div className="space-y-6">
          {invoice.status === "PAID" && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardBody className="flex gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-900">Paid {formatDate(invoice.paidAt)}</p>
                  <p className="text-emerald-800/80">{METHOD_LABEL[invoice.paymentMethod ?? "other"]}</p>
                </div>
              </CardBody>
            </Card>
          )}
          {invoice.status === "VOID" && (
            <Card>
              <CardBody className="flex gap-3 text-sm">
                <XCircle className="size-5 shrink-0 text-zinc-400" />
                <p className="text-zinc-600">This invoice was voided and no longer needs to be paid.</p>
              </CardBody>
            </Card>
          )}

          {!viewer.isTeam && invoice.status === "OPEN" && (
            <Card>
              <CardBody className="space-y-4 py-5">
                <div>
                  <p className="text-sm text-zinc-500">Amount due</p>
                  <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(invoice.total, invoice.currency)}</p>
                  <p className="mt-1 text-sm text-zinc-500">Due {formatDate(invoice.dueDate)}</p>
                </div>
                {payable ? (
                  <form action={payInvoice}>
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <SubmitButton size="lg" className="w-full" pendingLabel="Redirecting to Stripe…">
                      <CreditCard /> Pay {formatMoney(invoice.total, invoice.currency)}
                    </SubmitButton>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                      <Lock className="size-3" /> Secure card payment powered by Stripe
                    </p>
                  </form>
                ) : (
                  <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
                    Online payment isn&apos;t available for this invoice. See the notes for how to pay, or contact {invoice.agency.name}.
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          {viewer.isTeam && invoice.status === "DRAFT" && (
            <Card>
              <CardHeader title="Ready to send?" description="The client's portal users and billing email will be notified." />
              <CardBody className="flex flex-wrap gap-2">
                <form action={sendInvoice}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <SubmitButton pendingLabel="Sending…">
                    <Send /> Send invoice
                  </SubmitButton>
                </form>
                <form action={deleteInvoice}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <ConfirmButton size="md" message={`Delete draft ${invoice.number}?`}>
                    <Trash2 /> Delete draft
                  </ConfirmButton>
                </form>
              </CardBody>
            </Card>
          )}

          {viewer.isTeam && invoice.status === "OPEN" && (
            <Card>
              <CardHeader title="Record a payment" description={payable ? "The client can pay by card from their portal. Got paid another way? Record it here." : "Record a payment received outside ClientDesk."} />
              <CardBody className="space-y-4">
                <form action={markInvoicePaid} className="flex gap-2">
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <Select name="method" defaultValue="bank_transfer" aria-label="Payment method">
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </Select>
                  <SubmitButton variant="secondary">Mark paid</SubmitButton>
                </form>
                <form action={voidInvoice} className="border-t border-zinc-100 pt-4">
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <ConfirmButton message={`Void ${invoice.number}? The client will no longer be able to pay it.`}>
                    <XCircle /> Void invoice
                  </ConfirmButton>
                </form>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Details" />
            <CardBody className="py-2">
              <DescriptionList
                items={[
                  { label: "Client", value: viewer.isTeam ? <Link className="hover:text-brand-700" href={`/clients/${invoice.clientId}`}>{invoice.client.name}</Link> : invoice.client.name },
                  ...(invoice.project ? [{ label: "Project", value: <Link className="hover:text-brand-700" href={`/projects/${invoice.project.id}`}>{invoice.project.name}</Link> }] : []),
                  { label: "Currency", value: invoice.currency.toUpperCase() },
                  { label: "Sent", value: formatDate(invoice.sentAt) },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
