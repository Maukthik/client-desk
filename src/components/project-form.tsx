"use client";

import { useActionState } from "react";
import type { ProjectStatus } from "@prisma/client";
import { createProject, updateProject } from "@/app/actions/projects";
import { ButtonLink } from "@/components/ui/button";
import { Field, FormAlert, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { PROJECT_STATUS, PROJECT_STATUS_ORDER } from "@/lib/status";

type Project = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
};

export function ProjectForm({
  clients,
  project,
  defaultClientId,
  compact,
}: {
  clients: { id: string; name: string }[];
  project?: Project;
  defaultClientId?: string;
  compact?: boolean;
}) {
  const [state, action] = useActionState(project ? updateProject : createProject, null);
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className={compact ? "space-y-4" : "space-y-5"}>
      {project && <input type="hidden" name="projectId" value={project.id} />}
      <FormAlert message={state?.error} />
      <FormAlert tone="success" message={state?.success} />
      <Field label="Project name" htmlFor="name" error={e.name}>
        <Input id="name" name="name" defaultValue={project?.name} placeholder="Website redesign" required autoFocus={!project} />
      </Field>
      <div className={compact ? "space-y-4" : "grid gap-5 sm:grid-cols-2"}>
        <Field label="Client" htmlFor="clientId" error={e.clientId}>
          <Select id="clientId" name="clientId" defaultValue={project?.clientId ?? defaultClientId ?? ""} required>
            <option value="" disabled>
              Choose a client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status" error={e.status}>
          <Select id="status" name="status" defaultValue={project?.status ?? "PLANNING"}>
            {PROJECT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start date" htmlFor="startDate" error={e.startDate}>
          <Input id="startDate" name="startDate" type="date" defaultValue={project?.startDate} />
        </Field>
        <Field label="Due date" htmlFor="dueDate" error={e.dueDate}>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={project?.dueDate} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" error={e.description} hint={compact ? undefined : "Visible to the client in their portal."}>
        <Textarea id="description" name="description" defaultValue={project?.description ?? ""} rows={compact ? 3 : 4} />
      </Field>
      <div className={compact ? "" : "flex justify-end gap-2 border-t border-zinc-100 pt-5"}>
        {!compact && (
          <ButtonLink href="/projects" variant="secondary">
            Cancel
          </ButtonLink>
        )}
        <SubmitButton variant={compact ? "secondary" : "primary"} size={compact ? "sm" : "md"} pendingLabel="Saving…">
          {project ? "Save changes" : "Create project"}
        </SubmitButton>
      </div>
    </form>
  );
}
