"use client";

import { useActionState, useState } from "react";
import { Check, MessageSquareWarning } from "lucide-react";
import { reviewDeliverable } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { FormAlert, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function ReviewForm({ deliverableId }: { deliverableId: string }) {
  const [state, action] = useActionState(reviewDeliverable, null);
  const [requesting, setRequesting] = useState(false);

  if (state?.success) return <FormAlert tone="success" message={state.success} />;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-sm font-medium text-amber-900">Your approval is needed</p>
      <p className="mt-0.5 text-sm text-amber-800/80">Review the files above, then approve or tell the team what to change.</p>
      <FormAlert message={state?.error} />
      {requesting ? (
        <form action={action} className="mt-3 space-y-3">
          <input type="hidden" name="deliverableId" value={deliverableId} />
          <input type="hidden" name="decision" value="changes" />
          <Textarea name="note" rows={3} placeholder="What would you like changed?" required autoFocus aria-label="Requested changes" className="bg-white" />
          {state?.fieldErrors?.note && <p className="text-sm text-red-600">{state.fieldErrors.note}</p>}
          <div className="flex gap-2">
            <SubmitButton size="sm" pendingLabel="Sending…">Send feedback</SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRequesting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={action}>
            <input type="hidden" name="deliverableId" value={deliverableId} />
            <input type="hidden" name="decision" value="approve" />
            <SubmitButton size="sm" className="bg-emerald-600 hover:bg-emerald-700" pendingLabel="Approving…">
              <Check /> Approve
            </SubmitButton>
          </form>
          <Button variant="secondary" size="sm" onClick={() => setRequesting(true)}>
            <MessageSquareWarning /> Request changes
          </Button>
        </div>
      )}
    </div>
  );
}
