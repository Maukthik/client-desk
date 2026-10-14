import "server-only";
import { db } from "./db";

export async function logActivity(input: {
  agencyId: string;
  actorId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  message: string;
  href?: string;
}) {
  await db.activity.create({ data: input });
}
