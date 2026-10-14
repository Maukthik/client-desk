"use client";

import { useActionState } from "react";
import { updateClient } from "@/app/actions/clients";
import { Field, FormAlert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type Client = { id: string; name: string; email: string | null; phone: string | null; website: string | null };

export function EditClientForm({ client }: { client: Client }) {
  const [state, action] = useActionState(updateClient, null);
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="clientId" value={client.id} />
      <FormAlert message={state?.error} />
      <FormAlert tone="success" message={state?.success} />
      <Field label="Company name" htmlFor="name" error={e.name}>
        <Input id="name" name="name" defaultValue={client.name} required />
      </Field>
      <Field label="Billing email" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} />
      </Field>
      <Field label="Phone" htmlFor="phone" error={e.phone}>
        <Input id="phone" name="phone" defaultValue={client.phone ?? ""} />
      </Field>
      <Field label="Website" htmlFor="website" error={e.website}>
        <Input id="website" name="website" defaultValue={client.website ?? ""} />
      </Field>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
        Save details
      </SubmitButton>
    </form>
  );
}
