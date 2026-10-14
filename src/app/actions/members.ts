"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner, requireTeam } from "@/lib/dal";
import { fieldErrors, type FormState } from "@/lib/forms";
import { issueInvitation } from "@/lib/invitations";
import { isMailConfigured } from "@/lib/mail";
import { logActivity } from "@/lib/activity";
import * as v from "@/lib/validation";

const inviteSchema = z.object({ email: v.email });

function inviteSuccess(email: string, url: string): FormState {
  return {
    success: isMailConfigured()
      ? `Invitation sent to ${email}.`
      : `Invitation created for ${email}. Email isn't configured, so share this link with them:`,
    inviteUrl: url,
  };
}

export async function inviteTeamMember(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireOwner();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email } = parsed.data;

  const existing = await db.membership.findFirst({ where: { agencyId: viewer.agency.id, user: { email } } });
  if (existing) return { fieldErrors: { email: "This person is already part of your workspace." } };

  const url = await issueInvitation({
    agencyId: viewer.agency.id,
    agencyName: viewer.agency.name,
    email,
    role: "MEMBER",
    invitedBy: viewer.user,
  });
  revalidatePath("/team");
  return inviteSuccess(email, url);
}

export async function inviteClientContact(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireTeam();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const client = await db.client.findFirst({ where: { id: String(formData.get("clientId")), agencyId: viewer.agency.id } });
  if (!client) return { error: "Client not found." };
  const { email } = parsed.data;

  const existing = await db.membership.findFirst({ where: { agencyId: viewer.agency.id, user: { email } } });
  if (existing) return { fieldErrors: { email: "This person already has access to your workspace." } };

  const url = await issueInvitation({
    agencyId: viewer.agency.id,
    agencyName: viewer.agency.name,
    email,
    role: "CLIENT",
    clientId: client.id,
    clientName: client.name,
    invitedBy: viewer.user,
  });
  await logActivity({
    agencyId: viewer.agency.id,
    actorId: viewer.user.id,
    clientId: client.id,
    message: `${viewer.user.name} invited ${email} to the ${client.name} portal`,
    href: `/clients/${client.id}`,
  });
  revalidatePath(`/clients/${client.id}`);
  return inviteSuccess(email, url);
}

export async function revokeInvitation(formData: FormData) {
  const viewer = await requireTeam();
  const invitation = await db.invitation.findFirst({
    where: { id: String(formData.get("invitationId")), agencyId: viewer.agency.id, acceptedAt: null },
  });
  if (!invitation) return;
  // Only owners can manage team invitations; any team member can manage client invites.
  if (invitation.role !== "CLIENT" && !viewer.isOwner) return;
  await db.invitation.delete({ where: { id: invitation.id } });
  revalidatePath(invitation.clientId ? `/clients/${invitation.clientId}` : "/team");
}

export async function removeMember(formData: FormData) {
  const viewer = await requireTeam();
  const membership = await db.membership.findFirst({
    where: { id: String(formData.get("membershipId")), agencyId: viewer.agency.id },
    include: { user: true },
  });
  if (!membership || membership.role === "OWNER") return;
  if (membership.role === "MEMBER" && !viewer.isOwner) return;
  await db.membership.delete({ where: { id: membership.id } });
  // Drop the removed user's sessions pointing at this agency so access ends immediately.
  await db.session.updateMany({
    where: { userId: membership.userId, activeAgencyId: viewer.agency.id },
    data: { activeAgencyId: null },
  });
  revalidatePath(membership.clientId ? `/clients/${membership.clientId}` : "/team");
}
