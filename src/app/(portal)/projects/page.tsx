import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { ProjectList } from "@/components/project-list";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { projectScope, requireViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects" };

const filters = {
  active: { label: "Active", where: { status: { not: "COMPLETED" } } },
  review: { label: "Awaiting approval", where: { deliverables: { some: { status: "PENDING_REVIEW" } } } },
  completed: { label: "Completed", where: { status: "COMPLETED" } },
  all: { label: "All", where: {} },
} satisfies Record<string, { label: string; where: Prisma.ProjectWhereInput }>;

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const viewer = await requireViewer();
  const { filter: raw } = await searchParams;
  const filter = (typeof raw === "string" && raw in filters ? raw : "active") as keyof typeof filters;

  const scope = projectScope(viewer);
  const [projects, counts] = await Promise.all([
    db.project.findMany({
      where: { AND: [scope, filters[filter].where] },
      orderBy: [{ updatedAt: "desc" }],
      include: { client: { select: { name: true } }, deliverables: { select: { status: true } } },
    }),
    Promise.all(
      Object.entries(filters).map(async ([key, f]) => [key, await db.project.count({ where: { AND: [scope, f.where] } })] as const),
    ).then(Object.fromEntries) as Promise<Record<keyof typeof filters, number>>,
  ]);

  return (
    <>
      <PageHeader
        title="Projects"
        description={viewer.isTeam ? "Everything your team is working on." : `Work ${viewer.agency.name} is doing for you.`}
        actions={
          viewer.isTeam && (
            <ButtonLink href="/projects/new">
              <Plus /> New project
            </ButtonLink>
          )
        }
      />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200">
        {(Object.keys(filters) as (keyof typeof filters)[]).map((key) => (
          <Link
            key={key}
            href={`/projects?filter=${key}`}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap",
              filter === key ? "border-brand-600 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {filters[key].label}
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", filter === key ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-500")}>
              {counts[key]}
            </span>
          </Link>
        ))}
      </div>
      <Card>
        {projects.length ? (
          <ProjectList projects={projects} showClient={viewer.isTeam} />
        ) : (
          <EmptyState
            icon={FolderKanban}
            title={filter === "active" ? "No active projects" : "Nothing here"}
            description={viewer.isTeam ? "Create a project for a client to start sharing deliverables." : "Projects will appear here once your agency adds them."}
            action={
              viewer.isTeam && (
                <ButtonLink href="/projects/new" size="sm">
                  <Plus /> New project
                </ButtonLink>
              )
            }
          />
        )}
      </Card>
    </>
  );
}
