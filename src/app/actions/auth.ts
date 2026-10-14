"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireViewer, getCurrentUser } from "@/lib/dal";
import { fieldErrors, safeRedirectPath, type FormState } from "@/lib/forms";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, getSession, setActiveAgency } from "@/lib/session";
import { findOpenInvitation, type OpenInvitation } from "@/lib/invitations";
import { logActivity } from "@/lib/activity";
import * as v from "@/lib/validation";

const signupSchema = z.object({
  name: v.name,
  email: v.email,
  password: v.password,
  agencyName: z.string().trim().min(2, "Enter your agency's name").max(120),
});

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, email, password, agencyName } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: "An account with this email already exists. Log in instead." } };
  }

  const passwordHash = await hashPassword(password);
  const { user, agency } = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });
    const agency = await tx.agency.create({
      data: { name: agencyName, memberships: { create: { userId: user.id, role: "OWNER" } } },
    });
    return { user, agency };
  });
  await logActivity({ agencyId: agency.id, actorId: user.id, message: `${name} created ${agencyName}` });
  await createSession(user.id, agency.id);
  redirect("/dashboard");
}

let dummy: Promise<string> | null = null;
function dummyHash() {
  dummy ??= hashPassword("not-a-real-password");
  return dummy;
}

const loginSchema = z.object({ email: v.email, password: z.string().min(1, "Enter your password") });

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Same error and similar timing whether the account exists or not.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok) return { error: "Incorrect email or password." };
  await createSession(user.id);
  redirect(safeRedirectPath(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function switchAgency(formData: FormData) {
  const viewer = await requireViewer();
  const agencyId = String(formData.get("agencyId"));
  if (viewer.memberships.some((m) => m.agencyId === agencyId)) {
    await setActiveAgency(viewer.sessionId, agencyId);
  }
  redirect("/dashboard");
}

const agencySchema = z.object({ agencyName: z.string().trim().min(2, "Enter your agency's name").max(120) });

/** For signed-in users with no agency (e.g. removed from their last one). */
export async function createAgency(_: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const parsed = agencySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const agency = await db.agency.create({
    data: { name: parsed.data.agencyName, memberships: { create: { userId: session.userId, role: "OWNER" } } },
  });
  await setActiveAgency(session.id, agency.id);
  redirect("/dashboard");
}

/* ------------------------------ Invitations ------------------------------ */

async function joinFromInvitation(invitation: OpenInvitation, userId: string, userName: string) {
  await db.$transaction(async (tx) => {
    const existing = await tx.membership.findUnique({ where: { userId_agencyId: { userId, agencyId: invitation.agencyId } } });
    if (!existing) {
      await tx.membership.create({
        data: { userId, agencyId: invitation.agencyId, role: invitation.role, clientId: invitation.clientId },
      });
    }
    await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  });
  await logActivity({
    agencyId: invitation.agencyId,
    actorId: userId,
    clientId: invitation.clientId,
    message:
      invitation.role === "CLIENT"
        ? `${userName} joined the portal for ${invitation.client?.name ?? "a client"}`
        : `${userName} joined the team`,
  });
}

const acceptNewSchema = z.object({ token: z.string().min(1), name: v.name, password: v.password });
const acceptExistingSchema = z.object({ token: z.string().min(1), password: z.string().min(1, "Enter your password") });

/** Accept an invitation by creating a new account, or by logging into an existing one. */
export async function acceptInvitation(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const invitation = await findOpenInvitation(token);
  if (!invitation) return { error: "This invitation is no longer valid." };

  const existingUser = await db.user.findUnique({ where: { email: invitation.email } });
  let user: { id: string; name: string };

  if (existingUser) {
    const parsed = acceptExistingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
    if (!(await verifyPassword(parsed.data.password, existingUser.passwordHash))) {
      return { fieldErrors: { password: "Incorrect password." } };
    }
    user = existingUser;
  } else {
    const parsed = acceptNewSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
    user = await db.user.create({
      data: { name: parsed.data.name, email: invitation.email, passwordHash: await hashPassword(parsed.data.password) },
    });
  }

  await joinFromInvitation(invitation, user.id, user.name);
  await createSession(user.id, invitation.agencyId);
  redirect("/dashboard");
}

/** Accept while already signed in as the invited email. */
export async function acceptInvitationAsCurrentUser(formData: FormData) {
  const current = await getCurrentUser();
  const session = await getSession();
  const token = String(formData.get("token") ?? "");
  const invitation = await findOpenInvitation(token);
  if (!current || !session || !invitation || invitation.email !== current.email) redirect(`/invite/${token}`);
  await joinFromInvitation(invitation, current.id, current.name);
  await setActiveAgency(session.id, invitation.agencyId);
  redirect("/dashboard");
}

