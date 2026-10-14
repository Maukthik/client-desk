import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Prisma, Role } from "@prisma/client";
import { db } from "./db";
import { getSession } from "./session";

export type Viewer = NonNullable<Awaited<ReturnType<typeof loadViewer>>>;

const loadViewer = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const memberships = await db.membership.findMany({
    where: { userId: session.userId },
    include: { agency: true, client: true },
    orderBy: { createdAt: "asc" },
  });

  const active =
    memberships.find((m) => m.agencyId === session.activeAgencyId) ?? memberships[0] ?? null;

  return {
    sessionId: session.id,
    user: session.user,
    membership: active,
    memberships: memberships.map((m) => ({
      agencyId: m.agencyId,
      agencyName: m.agency.name,
      role: m.role,
      clientName: m.client?.name ?? null,
    })),
  };
});

/** Returns the signed-in user, or null. Does not require agency membership. */
export async function getCurrentUser() {
  const viewer = await loadViewer();
  return viewer?.user ?? null;
}

export type PortalViewer = Viewer & {
  membership: NonNullable<Viewer["membership"]>;
  agency: NonNullable<Viewer["membership"]>["agency"];
  role: Role;
  clientId: string | null;
  isTeam: boolean;
  isOwner: boolean;
};

/** The signed-in user with an active agency membership, or null. */
export const getPortalViewer = cache(async (): Promise<PortalViewer | null> => {
  const viewer = await loadViewer();
  if (!viewer?.membership) return null;
  const { membership } = viewer;
  return {
    ...viewer,
    membership,
    agency: membership.agency,
    role: membership.role,
    clientId: membership.role === "CLIENT" ? membership.clientId : null,
    isTeam: membership.role !== "CLIENT",
    isOwner: membership.role === "OWNER",
  };
});

/** Requires a signed-in user with an active agency membership. */
export const requireViewer = cache(async (): Promise<PortalViewer> => {
  const viewer = await getPortalViewer();
  if (viewer) return viewer;
  redirect((await loadViewer()) ? "/onboarding" : "/login");
});

/** Agency staff only (owner or team member). Clients get a 404. */
export async function requireTeam() {
  const viewer = await requireViewer();
  if (!viewer.isTeam) notFound();
  return viewer;
}

export async function requireOwner() {
  const viewer = await requireViewer();
  if (!viewer.isOwner) notFound();
  return viewer;
}

/*
 * Scope filters. Every query for tenant data goes through one of these so that
 * team members only see their agency, and clients only see their own company.
 */
export function clientScope(viewer: PortalViewer): Prisma.ClientWhereInput {
  return viewer.clientId
    ? { agencyId: viewer.agency.id, id: viewer.clientId }
    : { agencyId: viewer.agency.id };
}

export function projectScope(viewer: PortalViewer): Prisma.ProjectWhereInput {
  return viewer.clientId
    ? { agencyId: viewer.agency.id, clientId: viewer.clientId }
    : { agencyId: viewer.agency.id };
}

export function invoiceScope(viewer: PortalViewer): Prisma.InvoiceWhereInput {
  // Clients never see drafts.
  return viewer.clientId
    ? { agencyId: viewer.agency.id, clientId: viewer.clientId, status: { not: "DRAFT" } }
    : { agencyId: viewer.agency.id };
}

export function activityScope(viewer: PortalViewer): Prisma.ActivityWhereInput {
  return viewer.clientId
    ? { agencyId: viewer.agency.id, clientId: viewer.clientId }
    : { agencyId: viewer.agency.id };
}
