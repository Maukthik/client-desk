import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { requireTeam } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const viewer = await requireTeam();
  const clients = await db.client.findMany({
    where: { agencyId: viewer.agency.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { memberships: true } },
      projects: { select: { status: true } },
      invoices: { where: { status: "OPEN" }, select: { total: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Companies you work with and the people who can access their portal."
        actions={
          <ButtonLink href="/clients/new">
            <Plus /> Add client
          </ButtonLink>
        }
      />
      <Card>
        {clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clients yet"
            description="Add your first client, then invite their team to a portal where they can review work and pay invoices."
            action={
              <ButtonLink href="/clients/new">
                <Plus /> Add client
              </ButtonLink>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Active projects</Th>
                <Th>Portal users</Th>
                <Th className="text-right">Outstanding</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const active = client.projects.filter((p) => p.status !== "COMPLETED").length;
                const outstanding = client.invoices.reduce((sum, i) => sum + i.total, 0);
                return (
                  <tr key={client.id} className="hover:bg-zinc-50/70">
                    <Td>
                      <Link href={`/clients/${client.id}`} className="flex items-center gap-3">
                        <Avatar name={client.name} className="rounded-lg" />
                        <span>
                          <span className="block font-medium text-zinc-900 hover:text-brand-700">{client.name}</span>
                          <span className="block text-xs text-zinc-500">{client.email ?? "No billing email"}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="tabular-nums text-zinc-600">
                      {active} <span className="text-zinc-400">/ {client.projects.length}</span>
                    </Td>
                    <Td className="tabular-nums text-zinc-600">{client._count.memberships}</Td>
                    <Td className="text-right font-medium tabular-nums">
                      {outstanding ? formatMoney(outstanding, viewer.agency.currency) : <span className="text-zinc-400">—</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
