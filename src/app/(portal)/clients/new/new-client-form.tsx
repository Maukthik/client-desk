"use client";

import { useActionState } from "react";
import { createClient } from "@/app/actions/clients";
import { ButtonLink } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function NewClientForm() {
  const [state, action] = useActionState(createClient, null);
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
      <FormAlert message={state?.error} />
      <Field label="Company name" htmlFor="name" error={e.name}>
        <Input id="name" name="name" placeholder="Acme Inc." required autoFocus />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Billing email" htmlFor="email" error={e.email} hint="Receives invoice notifications.">
          <Input id="email" name="email" type="email" placeholder="billing@acme.com" />
        </Field>
        <Field label="Phone" htmlFor="phone" error={e.phone}>
          <Input id="phone" name="phone" type="tel" />
        </Field>
      </div>
      <Field label="Website" htmlFor="website" error={e.website}>
        <Input id="website" name="website" placeholder="acme.com" />
      </Field>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <Field
          label="Invite a contact to the portal (optional)"
          htmlFor="inviteEmail"
          error={e.inviteEmail}
          hint="They'll get an email to create their login. You can invite more people later."
        >
          <Input id="inviteEmail" name="inviteEmail" type="email" placeholder="jane@acme.com" className="bg-white" />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-5">
        <ButtonLink href="/clients" variant="secondary">
          Cancel
        </ButtonLink>
        <SubmitButton pendingLabel="Saving…">Add client</SubmitButton>
      </div>
    </form>
  );
}
