"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner, requireViewer } from "@/lib/dal";
import { fieldErrors, type FormState } from "@/lib/forms";
import { CURRENCIES } from "@/lib/money";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getStripe, isConnectEnabled } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";
import * as v from "@/lib/validation";

const agencySchema = z.object({
  name: z.string().trim().min(2, "Enter your agency's name").max(120),
  currency: z.enum(CURRENCIES.map((c) => c.code) as [string, ...string[]]),
  invoicePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,8}$/, "Use 1–8 letters or numbers"),
});

export async function updateAgency(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireOwner();
  const parsed = agencySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.agency.update({ where: { id: viewer.agency.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { success: "Agency settings saved. Currency changes apply to new invoices." };
}

const profileSchema = z.object({ name: v.name });

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.user.update({ where: { id: viewer.user.id }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return { success: "Profile saved." };
}

const passwordSchema = z.object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: v.password });

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const user = await db.user.findUniqueOrThrow({ where: { id: viewer.user.id } });
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { fieldErrors: { currentPassword: "That's not your current password." } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
  // Sign out every other session.
  await db.session.deleteMany({ where: { userId: user.id, id: { not: viewer.sessionId } } });
  return { success: "Password changed. Other devices have been signed out." };
}

/** Connect mode: create (or resume) the agency's Stripe Express onboarding. */
export async function connectStripe() {
  const viewer = await requireOwner();
  if (!isConnectEnabled()) redirect("/settings");
  const stripe = getStripe();
  let accountId = viewer.agency.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      controller: {
        stripe_dashboard: { type: "express" },
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "stripe",
      },
      email: viewer.user.email,
      business_profile: { name: viewer.agency.name },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { agencyId: viewer.agency.id },
    });
    accountId = account.id;
    await db.agency.update({ where: { id: viewer.agency.id }, data: { stripeAccountId: accountId } });
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: appUrl("/settings?stripe=refresh"),
    return_url: appUrl("/settings?stripe=return"),
  });
  redirect(link.url);
}

export async function openStripeDashboard() {
  const viewer = await requireOwner();
  if (!viewer.agency.stripeAccountId) redirect("/settings");
  const link = await getStripe().accounts.createLoginLink(viewer.agency.stripeAccountId);
  redirect(link.url);
}
