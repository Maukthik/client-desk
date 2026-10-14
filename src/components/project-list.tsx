import Link from "next/link";
import { CalendarDays, ChevronRight, FileCheck2 } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { ProjectBadge } from "@/components/status-badges";
import { formatDate } from "@/lib/utils";

export type ProjectRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  dueDate: Date | null;
  client: { name: string };
  deliverables: { status: string }[];
};

export function ProjectList({ projects, showClient = true }: { projects: ProjectRow[]; showClient?: boolean }) {
  return (
    <ul className="divide-y divide-zinc-100">
      {projects.map((project) => {
        const total = project.deliverables.length;
        const approved = project.deliverables.filter((d) => d.status === "APPROVED").length;
        const pending = project.deliverables.filter((d) => d.status === "PENDING_REVIEW").length;
        const pct = total ? Math.round((approved / total) * 100) : 0;
        return (
          <li key={project.id}>
            <Link href={`/projects/${project.id}`} className="group flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/70">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-zinc-900 group-hover:text-brand-700">{project.name}</p>
                  <ProjectBadge status={project.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  {showClient && <span>{project.client.name}</span>}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> {project.dueDate ? `Due ${formatDate(project.dueDate)}` : "No due date"}
                  </span>
                  {pending > 0 && (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                      <FileCheck2 className="size-3.5" /> {pending} awaiting approval
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden w-40 shrink-0 sm:block">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Approved</span>
                  <span className="tabular-nums">
                    {approved}/{total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-zinc-300 group-hover:text-zinc-500" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
