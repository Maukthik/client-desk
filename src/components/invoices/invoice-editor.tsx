"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createInvoice, updateInvoice } from "@/app/actions/invoices";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormAlert, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { computeInvoiceTotals, formatMoney, toMinorUnits } from "@/lib/money";

type Item = { key: number; description: string; quantity: string; unitPrice: string };

export type InvoiceDraft = {
  id?: string;
  clientId: string;
  projectId: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  notes: string;
  items: { description: string; quantity: string; unitPrice: string }[];
};

let nextKey = 1;

export function InvoiceEditor({
  draft,
  clients,
  projects,
  currency,
  number,
}: {
  draft: InvoiceDraft;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  currency: string;
  number?: string;
}) {
  const [state, action] = useActionState(draft.id ? updateInvoice : createInvoice, null);
  const e = state?.fieldErrors ?? {};
  const [clientId, setClientId] = useState(draft.clientId);
  const [projectId, setProjectId] = useState(draft.projectId);
  const [taxRate, setTaxRate] = useState(draft.taxRate);
  const [items, setItems] = useState<Item[]>(() =>
    (draft.items.length ? draft.items : [{ description: "", quantity: "1", unitPrice: "" }]).map((i) => ({ ...i, key: nextKey++ })),
  );

  const clientProjects = projects.filter((p) => p.clientId === clientId);
  const totals = useMemo(
    () =>
      computeInvoiceTotals(
        items.map((i) => ({ quantity: Number(i.quantity) || 0, unitAmount: toMinorUnits(Number(i.unitPrice) || 0, currency) })),
        Math.round((Number(taxRate) || 0) * 100),
      ),
    [items, taxRate, currency],
  );

  const update = (key: number, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const itemErrors = Object.entries(e).filter(([k]) => k.startsWith("items")).map(([, msg]) => msg);

  return (
    <form action={action} className="space-y-6">
      {draft.id && <input type="hidden" name="invoiceId" value={draft.id} />}
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })))} />
      <FormAlert message={state?.error ?? (Object.keys(e).length ? "Please fix the highlighted fields." : undefined)} />

      <Card>
        <CardHeader title="Details" description={number ? `Invoice ${number}` : "A number is assigned when you save."} />
        <CardBody className="grid gap-5 py-5 sm:grid-cols-2">
          <Field label="Client" htmlFor="clientId" error={e.clientId}>
            <Select
              id="clientId"
              name="clientId"
              value={clientId}
              onChange={(ev) => {
                setClientId(ev.target.value);
                setProjectId("");
              }}
              required
            >
              <option value="" disabled>
                Choose a client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Project (optional)" htmlFor="projectId" error={e.projectId}>
            <Select id="projectId" name="projectId" value={projectId} onChange={(ev) => setProjectId(ev.target.value)} disabled={!clientId}>
              <option value="">No project</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Issue date" htmlFor="issueDate" error={e.issueDate}>
            <Input id="issueDate" name="issueDate" type="date" defaultValue={draft.issueDate} required />
          </Field>
          <Field label="Due date" htmlFor="dueDate" error={e.dueDate}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={draft.dueDate} required />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Line items" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <th className="px-5 py-2.5 font-medium">Description</th>
                <th className="w-24 px-2 py-2.5 font-medium">Qty</th>
                <th className="w-36 px-2 py-2.5 font-medium">Unit price</th>
                <th className="w-32 px-2 py-2.5 text-right font-medium">Amount</th>
                <th className="w-12 px-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.key} className="align-top">
                  <td className="px-5 py-1.5">
                    <Input
                      value={item.description}
                      onChange={(ev) => update(item.key, { description: ev.target.value })}
                      placeholder="Design sprint — week 1"
                      aria-label={`Line ${index + 1} description`}
                      required
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(ev) => update(item.key, { quantity: ev.target.value })}
                      aria-label={`Line ${index + 1} quantity`}
                      required
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(ev) => update(item.key, { unitPrice: ev.target.value })}
                      placeholder="0.00"
                      aria-label={`Line ${index + 1} unit price`}
                      required
                    />
                  </td>
                  <td className="px-2 py-1.5 pt-3.5 text-right font-medium tabular-nums">{formatMoney(totals.lines[index] ?? 0, currency)}</td>
                  <td className="px-2 py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-0.5"
                      onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
                      disabled={items.length === 1}
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setItems((list) => [...list, { key: nextKey++, description: "", quantity: "1", unitPrice: "" }])}>
            <Plus /> Add line
          </Button>
          {itemErrors.length > 0 && <p className="mt-2 text-sm text-red-600">{itemErrors[0]}</p>}
        </div>
        <div className="flex flex-col gap-6 border-t border-zinc-100 px-5 py-5 sm:flex-row sm:justify-between">
          <Field label="Notes" htmlFor="notes" error={e.notes} className="sm:max-w-sm sm:flex-1">
            <Textarea id="notes" name="notes" rows={3} defaultValue={draft.notes} placeholder="Payment terms, bank details, thank-you note…" />
          </Field>
          <dl className="w-full space-y-2 text-sm sm:w-72">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotal, currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-zinc-500">
                <label htmlFor="taxRate">Tax</label>
                <span className="relative">
                  <Input
                    id="taxRate"
                    name="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(ev) => setTaxRate(ev.target.value)}
                    className="h-8 w-20 [appearance:textfield] pr-6 text-right [&::-webkit-inner-spin-button]:appearance-none"
                    aria-invalid={Boolean(e.taxRate)}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-zinc-400">%</span>
                </span>
              </dt>
              <dd className="tabular-nums">{formatMoney(totals.tax, currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(totals.total, currency)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ButtonLink href={draft.id ? `/invoices/${draft.id}` : "/invoices"} variant="ghost">
          Cancel
        </ButtonLink>
        <SubmitButton name="intent" value="draft" variant="secondary">
          Save draft
        </SubmitButton>
        <SubmitButton name="intent" value="send">
          Save and send to client
        </SubmitButton>
      </div>
    </form>
  );
}
