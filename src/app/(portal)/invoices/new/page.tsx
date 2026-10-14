import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireTeam } from "@/lib/dal";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/utils";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  const viewer = await requireTeam();
  const { clientId, projectId } = await searchParams;
  const [clients, projects] = await Promise.all([
    db.client.findMany({ where: { agencyId: viewer.agency.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ where: { agencyId: viewer.agency.id }, orderBy: { name: "asc" }, select: { id: true, name: true, clientId: true } }),
  ]);
  const today = new Date();
  const due = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 14);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={<Link href="/invoices" className="hover:text-zinc-800">← Invoices</Link>} title="New invoice" />
      {clients.length === 0 ? (
        <Card>
          <EmptyState icon={Building2} title="Add a client first" action={<ButtonLink href="/clients/new" size="sm"><Plus /> Add client</ButtonLink>} />
        </Card>
      ) : (
        <InvoiceEditor
          currency={viewer.agency.currency}
          clients={clients}
          projects={projects}
          draft={{
            clientId: typeof clientId === "string" && clients.some((c) => c.id === clientId) ? clientId : "",
            projectId: typeof projectId === "string" ? projectId : "",
            issueDate: toDateInput(today),
            dueDate: toDateInput(due),
            taxRate: "0",
            notes: "",
            items: [],
          }}
        />
      )}
    </div>
  );
}
