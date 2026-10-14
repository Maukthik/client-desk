import type { Metadata } from "next";
import { UserMinus, X } from "lucide-react";
import { inviteTeamMember, removeMember, revokeInvitation } from "@/app/actions/members";
import { InviteForm } from "@/components/invite-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { requireTeam } from "@/lib/dal";
import { db } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { ROLE_LABEL } from "@/lib/status";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const viewer = await requireTeam();
  const [members, invitations] = await Promise.all([
    db.membership.findMany({
      where: { agencyId: viewer.agency.id, role: { in: ["OWNER", "MEMBER"] } },
      include: { user: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.invitation.findMany({
      where: { agencyId: viewer.agency.id, role: { in: ["OWNER", "MEMBER"] }, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Team" description={`People at ${viewer.agency.name} who manage clients, projects and invoices.`} />
      <div className="space-y-6">
        {viewer.isOwner && (
          <Card>
            <CardHeader title="Invite a team member" description="They'll be able to manage every client, project and invoice." />
            <CardBody>
              <InviteForm action={inviteTeamMember} placeholder="colleague@agency.com" mailConfigured={isMailConfigured()} />
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title="Members" description={`${members.length} ${members.length === 1 ? "person" : "people"}`} />
          <ul className="divide-y divide-zinc-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar name={m.user.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.user.name} {m.userId === viewer.user.id && <span className="font-normal text-zinc-400">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{m.user.email}</p>
                </div>
                <Badge tone={m.role === "OWNER" ? "brand" : "neutral"} dot={false}>
                  {ROLE_LABEL[m.role]}
                </Badge>
                {viewer.isOwner && m.role !== "OWNER" && (
                  <form action={removeMember}>
                    <input type="hidden" name="membershipId" value={m.id} />
                    <ConfirmButton size="icon" message={`Remove ${m.user.name} from ${viewer.agency.name}?`} aria-label={`Remove ${m.user.name}`}>
                      <UserMinus />
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar name={inv.email} className="bg-zinc-100 text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-700">{inv.email}</p>
                  <p className="text-xs text-zinc-500">Invited {formatDate(inv.createdAt)} · expires {formatDate(inv.expiresAt)}</p>
                </div>
                <Badge tone="amber">Pending</Badge>
                {viewer.isOwner && (
                  <form action={revokeInvitation}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <ConfirmButton size="icon" message={`Revoke the invitation for ${inv.email}?`} aria-label={`Revoke invitation for ${inv.email}`}>
                      <X />
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
