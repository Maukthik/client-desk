import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, CreditCard, ExternalLink } from "lucide-react";
import { connectStripe, openStripeDashboard } from "@/app/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStripe, isConnectEnabled, isStripeConfigured } from "@/lib/stripe";
import { AgencyForm, PasswordForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

async function PaymentsCard({ agency }: { agency: { id: string; stripeAccountId: string | null; stripeChargesEnabled: boolean } }) {
  if (!isStripeConfigured()) {
    return (
      <Card>
        <CardHeader title="Online payments" action={<Badge tone="neutral">Not configured</Badge>} />
        <CardBody className="text-sm text-zinc-600">
          Set <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">STRIPE_SECRET_KEY</code> and{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">STRIPE_WEBHOOK_SECRET</code> on the server to let clients pay invoices by card.
          You can still record payments received by bank transfer, check or cash.
        </CardBody>
      </Card>
    );
  }

  if (!isConnectEnabled()) {
    return (
      <Card>
        <CardHeader title="Online payments" action={<Badge tone="green">Active</Badge>} />
        <CardBody className="flex gap-3 text-sm text-zinc-600">
          <CreditCard className="size-5 shrink-0 text-zinc-400" />
          Clients can pay open invoices by card. Payments go to the Stripe account configured for this ClientDesk installation.
        </CardBody>
      </Card>
    );
  }

  // Connect mode: refresh the account status when the owner views this page.
  let chargesEnabled = agency.stripeChargesEnabled;
  if (agency.stripeAccountId) {
    try {
      const account = await getStripe().accounts.retrieve(agency.stripeAccountId);
      chargesEnabled = Boolean(account.charges_enabled);
      if (chargesEnabled !== agency.stripeChargesEnabled) {
        await db.agency.update({ where: { id: agency.id }, data: { stripeChargesEnabled: chargesEnabled } });
      }
    } catch (error) {
      console.error("Could not refresh Stripe account", error);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Online payments"
        description="Connect a Stripe account so clients can pay invoices by card. Payouts go straight to your bank."
        action={chargesEnabled ? <Badge tone="green">Connected</Badge> : agency.stripeAccountId ? <Badge tone="amber">Setup incomplete</Badge> : <Badge>Not connected</Badge>}
      />
      <CardBody className="space-y-4">
        {chargesEnabled ? (
          <p className="flex items-center gap-2 text-sm text-zinc-600">
            <CheckCircle2 className="size-4 text-emerald-600" /> Your Stripe account is ready to accept payments.
          </p>
        ) : agency.stripeAccountId ? (
          <p className="flex items-center gap-2 text-sm text-zinc-600">
            <CircleAlert className="size-4 text-amber-600" /> Stripe needs a few more details before you can accept payments.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!chargesEnabled && (
            <form action={connectStripe}>
              <SubmitButton pendingLabel="Opening Stripe…">
                <CreditCard /> {agency.stripeAccountId ? "Finish Stripe setup" : "Connect Stripe"}
              </SubmitButton>
            </form>
          )}
          {agency.stripeAccountId && chargesEnabled && (
            <form action={openStripeDashboard}>
              <SubmitButton variant="secondary" pendingLabel="Opening…">
                <ExternalLink /> Open Stripe dashboard
              </SubmitButton>
            </form>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default async function SettingsPage() {
  const viewer = await requireViewer();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description={viewer.isOwner ? "Manage your agency and your account." : "Manage your account."} />
      <div className="space-y-6">
        {viewer.isOwner && (
          <>
            <Card>
              <CardHeader title="Agency" />
              <CardBody>
                <AgencyForm agency={viewer.agency} />
              </CardBody>
            </Card>
            <PaymentsCard agency={viewer.agency} />
          </>
        )}
        <Card>
          <CardHeader title="Profile" />
          <CardBody>
            <ProfileForm name={viewer.user.name} email={viewer.user.email} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Password" />
          <CardBody>
            <PasswordForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
