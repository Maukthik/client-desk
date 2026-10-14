import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireTeam } from "@/lib/dal";
import { NewClientForm } from "./new-client-form";

export const metadata: Metadata = { title: "Add client" };

export default async function NewClientPage() {
  await requireTeam();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={<Link href="/clients" className="hover:text-zinc-800">← Clients</Link>}
        title="Add client"
        description="Create the client company, and optionally invite their first contact to the portal."
      />
      <Card>
        <CardBody className="py-6">
          <NewClientForm />
        </CardBody>
      </Card>
    </div>
  );
}
