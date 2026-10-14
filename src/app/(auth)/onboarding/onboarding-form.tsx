"use client";

import { useActionState } from "react";
import { createAgency } from "@/app/actions/auth";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function OnboardingForm() {
  const [state, action] = useActionState(createAgency, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <Field label="Agency name" htmlFor="agencyName" error={state?.fieldErrors?.agencyName}>
        <Input id="agencyName" name="agencyName" required autoFocus />
      </Field>
      <SubmitButton className="w-full">Create agency</SubmitButton>
    </form>
  );
}
