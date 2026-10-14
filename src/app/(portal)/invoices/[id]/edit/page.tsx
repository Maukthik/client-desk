import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireTeam } from "@/lib/dal";
import { db } from "@/lib/db";
import { fromMinorUnits } from "@/lib/money";
import { toDateInput } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: PageProps<"/invoices/[id]/edit">) {
  const viewer = await requireTeam();
  const { id } = await params;
  const invoice = await db.invoice.findFirst({ where: { id, agencyId: viewer.agency.id }, include: { items: { orderBy: { position: "asc" } } } });
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${id}`);
  const [clients, projects] = await Promise.all([
    db.client.findMany({ where: { agencyId: viewer.agency.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ where: { agencyId: viewer.agency.id }, orderBy: { name: "asc" }, select: { id: true, name: true, clientId: true } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={<Link href={`/invoices/${id}`} className="hover:text-zinc-800">← {invoice.number}</Link>} title="Edit invoice" />
      <InvoiceEditor
        currency={invoice.currency}
        clients={clients}
        projects={projects}
        number={invoice.number}
        draft={{
          id: invoice.id,
          clientId: invoice.clientId,
          projectId: invoice.projectId ?? "",
          issueDate: toDateInput(invoice.issueDate),
          dueDate: toDateInput(invoice.dueDate),
          taxRate: String(invoice.taxRate / 100),
          notes: invoice.notes ?? "",
          items: invoice.items.map((i) => ({
            description: i.description,
            quantity: i.quantity.toString(),
            unitPrice: String(fromMinorUnits(i.unitAmount, invoice.currency)),
          })),
        }}
      />
    </div>
  );
}
