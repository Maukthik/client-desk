"use client";

import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import { Field, FormAlert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignupForm() {
  const [state, action] = useActionState(signup, null);
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-8 space-y-4">
      <FormAlert message={state?.error} />
      <Field label="Agency name" htmlFor="agencyName" error={e.agencyName}>
        <Input id="agencyName" name="agencyName" placeholder="Northwind Studio" required autoFocus />
      </Field>
      <Field label="Your name" htmlFor="name" error={e.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Work email" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={e.password} hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Creating agency…">
        Create agency
      </SubmitButton>
    </form>
  );
}
