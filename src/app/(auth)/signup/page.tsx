import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your agency" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your agency</h1>
      <p className="mt-1.5 text-sm text-zinc-500">Set up your client portal in under a minute.</p>
      <SignupForm />
      <p className="mt-6 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </>
  );
}
