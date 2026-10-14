import type { Metadata } from "next";
import Link from "next/link";
import { MailX } from "lucide-react";
import { acceptInvitationAsCurrentUser, logout } from "@/app/actions/auth";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { findOpenInvitation } from "@/lib/invitations";
import { AcceptInviteForm } from "./accept-form";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invitation = await findOpenInvitation(token);

  if (!invitation) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
          <MailX className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">This invitation isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-zinc-500">
          It may have expired or already been used. Ask the person who invited you to send a new one.
        </p>
        <Link href="/login" className={buttonClasses({ variant: "secondary" }, "mt-6")}>
          Go to login
        </Link>
      </div>
    );
  }

  const isClient = invitation.role === "CLIENT";
  const heading = isClient ? `${invitation.agency.name} client portal` : `Join ${invitation.agency.name}`;
  const intro = isClient
    ? `${invitation.invitedBy.name} invited you to the portal for ${invitation.client?.name}. Follow projects, approve deliverables and pay invoices.`
    : `${invitation.invitedBy.name} invited you to join ${invitation.agency.name} as a team member.`;

  const current = await getCurrentUser();
  if (current) {
    const matches = current.email === invitation.email;
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-1.5 text-sm text-zinc-500">{intro}</p>
        {matches ? (
          <form action={acceptInvitationAsCurrentUser} className="mt-8">
            <input type="hidden" name="token" value={token} />
            <SubmitButton className="w-full">Accept invitation</SubmitButton>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              This invitation was sent to <strong>{invitation.email}</strong>, but you&apos;re logged in as{" "}
              <strong>{current.email}</strong>. Log out to accept it with the right account.
            </p>
            <form action={logout}>
              <SubmitButton variant="secondary" className="w-full">
                Log out
              </SubmitButton>
            </form>
          </div>
        )}
      </>
    );
  }

  const hasAccount = Boolean(await db.user.findUnique({ where: { email: invitation.email }, select: { id: true } }));
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      <p className="mt-1.5 text-sm text-zinc-500">{intro}</p>
      <AcceptInviteForm token={token} email={invitation.email} hasAccount={hasAccount} />
    </>
  );
}
