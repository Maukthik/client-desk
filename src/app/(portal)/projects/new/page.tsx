import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { ProjectForm } from "@/components/project-form";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireTeam } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  const viewer = await requireTeam();
  const { clientId } = await searchParams;
  const clients = await db.client.findMany({ where: { agencyId: viewer.agency.id }, orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow={<Link href="/projects" className="hover:text-zinc-800">← Projects</Link>} title="New project" />
      <Card>
        {clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Add a client first"
            description="Projects belong to a client. Add one, then come back to create the project."
            action={<ButtonLink href="/clients/new" size="sm"><Plus /> Add client</ButtonLink>}
          />
        ) : (
          <CardBody className="py-6">
            <ProjectForm clients={clients} defaultClientId={typeof clientId === "string" ? clientId : undefined} />
          </CardBody>
        )}
      </Card>
    </div>
  );
}
