import "server-only";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { sendMail } from "./mail";
import { generateToken, hashToken } from "./tokens";
import { appUrl } from "./utils";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export async function findOpenInvitation(token: string) {
  if (!token) return null;
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { agency: true, client: true, invitedBy: { select: { name: true } } },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) return null;
  return invitation;
}

export type OpenInvitation = NonNullable<Awaited<ReturnType<typeof findOpenInvitation>>>;

/**
 * Creates (or re-issues) an invitation and emails it. Returns the accept URL so
 * the inviter can share it directly when email isn't configured.
 */
export async function issueInvitation(input: {
  agencyId: string;
  agencyName: string;
  email: string;
  role: Role;
  clientId?: string | null;
  clientName?: string | null;
  invitedBy: { id: string; name: string };
}) {
  const token = generateToken();
  // Re-inviting the same address replaces any earlier pending invite.
  await db.invitation.deleteMany({
    where: { agencyId: input.agencyId, email: input.email, acceptedAt: null },
  });
  await db.invitation.create({
    data: {
      agencyId: input.agencyId,
      email: input.email,
      role: input.role,
      clientId: input.clientId ?? null,
      invitedById: input.invitedBy.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const url = appUrl(`/invite/${token}`);
  const isClient = input.role === "CLIENT";
  await sendMail({
    to: input.email,
    subject: isClient
      ? `${input.agencyName} invited you to your client portal`
      : `${input.invitedBy.name} invited you to join ${input.agencyName} on ClientDesk`,
    heading: isClient ? `Your ${input.agencyName} client portal` : `Join ${input.agencyName}`,
    body: isClient
      ? [
          `${input.invitedBy.name} at ${input.agencyName} has set up a portal for ${input.clientName ?? "you"}.`,
          "You can follow project progress, download and approve deliverables, and pay invoices online.",
          "This invitation expires in 14 days.",
        ]
      : [
          `${input.invitedBy.name} invited you to join ${input.agencyName} as a team member.`,
          "This invitation expires in 14 days.",
        ],
    cta: { label: "Accept invitation", href: url },
  });
  return url;
}
