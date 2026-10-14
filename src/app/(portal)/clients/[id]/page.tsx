import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FolderKanban, Plus, Receipt, Trash2, UserMinus, X } from "lucide-react";
import { deleteClient } from "@/app/actions/clients";
import { inviteClientContact, removeMember, revokeInvitation } from "@/app/actions/members";
import { InviteForm } from "@/components/invite-form";
import { InvoiceTable } from "@/components/invoice-table";
import { ProjectList } from "@/components/project-list";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormAlert } from "@/components/ui/form";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireTeam } from "@/lib/dal";
import { db } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { EditClientForm } from "./edit-client-form";

export async function generateMetadata({ params }: PageProps<"/clients/[id]">): Promise<Metadata> {
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id }, select: { name: true } });
  return { title: client?.name ?? "Client" };
}

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  const viewer = await requireTeam();
  const { id } = await params;
  const { invited } = await searchParams;
  const client = await db.client.findFirst({
    where: { id, agencyId: viewer.agency.id },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
      invitations: { where: { acceptedAt: null }, orderBy: { createdAt: "desc" } },
      projects: {
        orderBy: { updatedAt: "desc" },
        include: { client: { select: { name: true } }, deliverables: { select: { status: true } } },
      },
      invoices: {
        orderBy: { issueDate: "desc" },
        include: { client: { select: { name: true } }, project: { select: { name: true } } },
      },
    },
  });
  if (!client) notFound();

  const paid = client.invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0);
  const outstanding = client.invoices.filter((i) => i.status === "OPEN").reduce((s, i) => s + i.total, 0);
  const currency = viewer.agency.currency;

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/clients" className="hover:text-zinc-800">← Clients</Link>}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={client.name} className="size-9 rounded-lg text-sm" />
            {client.name}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/invoices/new?clientId=${client.id}`} variant="secondary">
              <Receipt /> New invoice
            </ButtonLink>
            <ButtonLink href={`/projects/new?clientId=${client.id}`}>
              <Plus /> New project
            </ButtonLink>
          </>
        }
      />
      {invited && <div className="mb-6"><FormAlert tone="success" message="Client added and portal invitation sent." /></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Projects" description={`${client.projects.length} total`} />
            {client.projects.length ? (
              <ProjectList projects={client.projects} showClient={false} />
            ) : (
              <EmptyState icon={FolderKanban} title="No projects yet" action={<ButtonLink href={`/projects/new?clientId=${client.id}`} size="sm"><Plus /> New project</ButtonLink>} />
            )}
          </Card>
          <Card>
            <CardHeader title="Invoices" description={`${formatMoney(paid, currency)} paid · ${formatMoney(outstanding, currency)} outstanding`} />
            {client.invoices.length ? (
              <InvoiceTable invoices={client.invoices} showClient={false} />
            ) : (
              <EmptyState icon={Receipt} title="No invoices yet" />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Portal access" description="People at this client who can log in." />
            <CardBody className="space-y-4">
              <ul className="space-y-3">
                {client.memberships.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.user.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.user.name}</p>
                      <p className="truncate text-xs text-zinc-500">{m.user.email}</p>
                    </div>
                    <form action={removeMember}>
                      <input type="hidden" name="membershipId" value={m.id} />
                      <ConfirmButton size="icon" message={`Remove ${m.user.name}'s portal access?`} aria-label={`Remove ${m.user.name}`}>
                        <UserMinus />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
                {client.invitations.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3">
                    <Avatar name={inv.email} className="bg-zinc-100 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-700">{inv.email}</p>
                      <p className="text-xs text-zinc-500">Invited {formatDate(inv.createdAt)}</p>
                    </div>
                    <Badge tone="amber">Pending</Badge>
                    <form action={revokeInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <ConfirmButton size="icon" message={`Revoke the invitation for ${inv.email}?`} aria-label={`Revoke invitation for ${inv.email}`}>
                        <X />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
                {client.memberships.length + client.invitations.length === 0 && (
                  <li className="text-sm text-zinc-500">Nobody has access yet.</li>
                )}
              </ul>
              <InviteForm action={inviteClientContact} hidden={{ clientId: client.id }} mailConfigured={isMailConfigured()} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <EditClientForm client={client} />
            </CardBody>
          </Card>

          {viewer.isOwner && (
            <Card className="border-red-200">
              <CardHeader title="Delete client" description="Removes all of this client's projects, files and invoices." />
              <CardBody>
                <form action={deleteClient}>
                  <input type="hidden" name="clientId" value={client.id} />
                  <ConfirmButton variant="danger" size="sm" message={`Permanently delete ${client.name} and all of its projects, files and invoices?`}>
                    <Trash2 /> Delete client
                  </ConfirmButton>
                </form>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
