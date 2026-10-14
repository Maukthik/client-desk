"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import type { FormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { FormAlert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function InviteForm({
  action,
  hidden,
  placeholder = "name@company.com",
  mailConfigured,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  hidden?: Record<string, string>;
  placeholder?: string;
  mailConfigured: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const copied = Boolean(state?.inviteUrl) && copiedUrl === state?.inviteUrl;

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row">
        {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div className="flex-1">
          <Input name="email" type="email" placeholder={placeholder} required aria-invalid={Boolean(state?.fieldErrors?.email)} aria-label="Email address" />
          {state?.fieldErrors?.email && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>}
        </div>
        <SubmitButton pendingLabel="Sending…">
          <Send /> Send invite
        </SubmitButton>
      </form>
      <FormAlert message={state?.error} />
      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <p>{state.success}</p>
          {state.inviteUrl && !mailConfigured && (
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 font-mono text-xs text-zinc-700 ring-1 ring-emerald-200">
                {state.inviteUrl}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(state.inviteUrl!);
                  setCopiedUrl(state.inviteUrl!);
                }}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
