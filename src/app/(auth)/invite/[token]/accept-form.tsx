"use client";

import { useActionState } from "react";
import { acceptInvitation } from "@/app/actions/auth";
import { Field, FormAlert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function AcceptInviteForm({ token, email, hasAccount }: { token: string; email: string; hasAccount: boolean }) {
  const [state, action] = useActionState(acceptInvitation, null);
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-8 space-y-4">
      <FormAlert message={state?.error} />
      <input type="hidden" name="token" value={token} />
      <Field label="Email" htmlFor="email">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      {!hasAccount && (
        <Field label="Your name" htmlFor="name" error={e.name}>
          <Input id="name" name="name" autoComplete="name" required autoFocus />
        </Field>
      )}
      <Field
        label={hasAccount ? "Password" : "Choose a password"}
        htmlFor="password"
        error={e.password}
        hint={hasAccount ? "You already have a ClientDesk account. Log in to accept." : "At least 8 characters."}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={hasAccount ? "current-password" : "new-password"}
          required
          autoFocus={hasAccount}
        />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Joining…">
        {hasAccount ? "Log in and accept" : "Create account and accept"}
      </SubmitButton>
    </form>
  );
}
