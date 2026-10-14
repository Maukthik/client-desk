import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { InvoiceTable } from "@/components/invoice-table";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { invoiceScope, requireViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const viewer = await requireViewer();
  const now = new Date();
  const filters: Record<string, { label: string; where: Prisma.InvoiceWhereInput; teamOnly?: boolean }> = {
    open: { label: "Unpaid", where: { status: "OPEN" } },
    overdue: { label: "Overdue", where: { status: "OPEN", dueDate: { lt: now } } },
    paid: { label: "Paid", where: { status: "PAID" } },
    draft: { label: "Drafts", where: { status: "DRAFT" }, teamOnly: true },
    all: { label: "All", where: {} },
  };
  const visible = Object.entries(filters).filter(([, f]) => viewer.isTeam || !f.teamOnly);
  const { filter: raw } = await searchParams;
  const filter = typeof raw === "string" && visible.some(([k]) => k === raw) ? raw : "all";
  const scope = invoiceScope(viewer);

  const [invoices, counts, openSum, overdueSum, paidSum] = await Promise.all([
    db.invoice.findMany({
      where: { AND: [scope, filters[filter]!.where] },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: { client: { select: { name: true } }, project: { select: { name: true } } },
    }),
    Promise.all(visible.map(async ([k, f]) => [k, await db.invoice.count({ where: { AND: [scope, f.where] } })] as const)).then(Object.fromEntries) as Promise<Record<string, number>>,
    db.invoice.aggregate({ where: { AND: [scope, filters.open!.where] }, _sum: { total: true } }),
    db.invoice.aggregate({ where: { AND: [scope, filters.overdue!.where] }, _sum: { total: true } }),
    db.invoice.aggregate({
      where: { AND: [scope, { status: "PAID", paidAt: { gte: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)) } }] },
      _sum: { total: true },
    }),
  ]);
  const currency = viewer.agency.currency;

  const stats = [
    { label: viewer.isTeam ? "Outstanding" : "Balance due", value: openSum._sum.total ?? 0 },
    { label: "Overdue", value: overdueSum._sum.total ?? 0, alert: (overdueSum._sum.total ?? 0) > 0 },
    { label: viewer.isTeam ? "Collected this year" : "Paid this year", value: paidSum._sum.total ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Invoices"
        description={viewer.isTeam ? "Bill clients and track what's been paid." : `Invoices from ${viewer.agency.name}.`}
        actions={
          viewer.isTeam && (
            <ButtonLink href="/invoices/new">
              <Plus /> New invoice
            </ButtonLink>
          )
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="px-5 py-4">
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", s.alert && "text-red-600")}>{formatMoney(s.value, currency)}</p>
          </Card>
        ))}
      </div>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200">
        {visible.map(([key, f]) => (
          <Link
            key={key}
            href={`/invoices?filter=${key}`}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap",
              filter === key ? "border-brand-600 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {f.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", filter === key ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-500")}>
              {counts[key]}
            </span>
          </Link>
        ))}
      </div>
      <Card>
        {invoices.length ? (
          <InvoiceTable invoices={invoices} showClient={viewer.isTeam} />
        ) : (
          <EmptyState
            icon={Receipt}
            title="No invoices here"
            description={viewer.isTeam ? "Create an invoice and send it to your client. They can pay by card from their portal." : "You're all caught up."}
            action={viewer.isTeam && <ButtonLink href="/invoices/new" size="sm"><Plus /> New invoice</ButtonLink>}
          />
        )}
      </Card>
    </>
  );
}
