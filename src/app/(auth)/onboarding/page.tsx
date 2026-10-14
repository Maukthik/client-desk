import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logout } from "@/app/actions/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Create your agency" };

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (await db.membership.count({ where: { userId: session.userId } })) redirect("/dashboard");
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re not part of an agency yet</h1>
      <p className="mt-1.5 text-sm text-zinc-500">
        Create your own agency, or ask an agency to send an invitation to <strong>{session.user.email}</strong>.
      </p>
      <OnboardingForm />
      <form action={logout} className="mt-6">
        <button className="text-sm font-medium text-zinc-500 hover:text-zinc-800">Log out</button>
      </form>
    </>
  );
}
