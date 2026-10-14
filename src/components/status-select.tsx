"use client";

import type { ProjectStatus } from "@prisma/client";
import { setProjectStatus } from "@/app/actions/projects";
import { Select } from "@/components/ui/form";
import { PROJECT_STATUS, PROJECT_STATUS_ORDER } from "@/lib/status";

export function StatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  return (
    <form action={setProjectStatus}>
      <input type="hidden" name="projectId" value={projectId} />
      <Select name="status" defaultValue={status} onChange={(e) => e.currentTarget.form?.requestSubmit()} aria-label="Project status" className="w-40">
        {PROJECT_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {PROJECT_STATUS[s].label}
          </option>
        ))}
      </Select>
    </form>
  );
}
