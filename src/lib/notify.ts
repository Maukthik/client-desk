import "server-only";
import { db } from "./db";

/** Email addresses of everyone with portal access for a client. */
export async function clientContactEmails(clientId: string) {
  const members = await db.membership.findMany({ where: { clientId, role: "CLIENT" }, include: { user: { select: { email: true } } } });
  return members.map((m) => m.user.email);
}

/** Email addresses of an agency's owners and team members. */
export async function teamEmails(agencyId: string) {
  const members = await db.membership.findMany({
    where: { agencyId, role: { in: ["OWNER", "MEMBER"] } },
    include: { user: { select: { email: true } } },
  });
  return members.map((m) => m.user.email);
}
