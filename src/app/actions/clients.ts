"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner, requireTeam } from "@/lib/dal";
import { fieldErrors, type FormState } from "@/lib/forms";
import { issueInvitation } from "@/lib/invitations";
import { logActivity } from "@/lib/activity";
import * as v from "@/lib/validation";

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((s) => s || null)
  .pipe(z.email("Enter a valid email address").nullable());

const clientSchema = z.object({
  name: z.string().trim().min(1, "Enter the client's name").max(120),
  email: optionalEmail,
  phone: v.optionalText(40),
  website: v.optionalText(200),
});

export async function createClient(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireTeam();
  const parsed = clientSchema.extend({ inviteEmail: optionalEmail }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { inviteEmail, ...data } = parsed.data;

  if (inviteEmail) {
    const existing = await db.membership.findFirst({ where: { agencyId: viewer.agency.id, user: { email: inviteEmail } } });
    if (existing) return { fieldErrors: { inviteEmail: "This person already has access to your workspace." } };
  }

  const client = await db.client.create({ data: { ...data, agencyId: viewer.agency.id } });
  await logActivity({
    agencyId: viewer.agency.id,
    actorId: viewer.user.id,
    clientId: client.id,
    message: `${viewer.user.name} added client ${client.name}`,
    href: `/clients/${client.id}`,
  });

  if (inviteEmail) {
    await issueInvitation({
      agencyId: viewer.agency.id,
      agencyName: viewer.agency.name,
      email: inviteEmail,
      role: "CLIENT",
      clientId: client.id,
      clientName: client.name,
      invitedBy: viewer.user,
    });
  }
  redirect(`/clients/${client.id}${inviteEmail ? "?invited=1" : ""}`);
}

export async function updateClient(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireTeam();
  const id = String(formData.get("clientId"));
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { count } = await db.client.updateMany({ where: { id, agencyId: viewer.agency.id }, data: parsed.data });
  if (!count) return { error: "Client not found." };
  revalidatePath(`/clients/${id}`);
  return { success: "Client details saved." };
}

export async function deleteClient(formData: FormData) {
  const viewer = await requireOwner();
  const id = String(formData.get("clientId"));
  await db.client.deleteMany({ where: { id, agencyId: viewer.agency.id } });
  redirect("/clients");
}
