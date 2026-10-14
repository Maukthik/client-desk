"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, updateAgency, updateProfile } from "@/app/actions/settings";
import { Field, FormAlert, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { CURRENCIES } from "@/lib/money";

export function AgencyForm({ agency }: { agency: { name: string; currency: string; invoicePrefix: string } }) {
  const [state, action] = useActionState(updateAgency, null);
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormAlert tone="success" message={state?.success} />
      <Field label="Agency name" htmlFor="agency-name" error={e.name}>
        <Input id="agency-name" name="name" defaultValue={agency.name} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Currency" htmlFor="currency" error={e.currency}>
          <Select id="currency" name="currency" defaultValue={agency.currency}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Invoice prefix" htmlFor="invoicePrefix" error={e.invoicePrefix} hint="e.g. INV → INV-1001">
          <Input id="invoicePrefix" name="invoicePrefix" defaultValue={agency.invoicePrefix} required />
        </Field>
      </div>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
        Save agency
      </SubmitButton>
    </form>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <FormAlert tone="success" message={state?.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="profile-name" error={state?.fieldErrors?.name}>
          <Input id="profile-name" name="name" defaultValue={name} required />
        </Field>
        <Field label="Email" htmlFor="profile-email">
          <Input id="profile-email" value={email} disabled readOnly />
        </Field>
      </div>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);
  const e = state?.fieldErrors ?? {};
  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormAlert tone="success" message={state?.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password" htmlFor="currentPassword" error={e.currentPassword}>
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password" htmlFor="newPassword" error={e.newPassword}>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </div>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Updating…">
        Change password
      </SubmitButton>
    </form>
  );
}
