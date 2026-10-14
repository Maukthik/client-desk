"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { projectScope, requireTeam, requireViewer } from "@/lib/dal";
import { fieldErrors, type FormState } from "@/lib/forms";
import { logActivity } from "@/lib/activity";
import { sendMail } from "@/lib/mail";
import { teamEmails } from "@/lib/notify";
import { removeObject } from "@/lib/storage";
import { PROJECT_STATUS } from "@/lib/status";
import { appUrl, parseDateInput } from "@/lib/utils";
import * as v from "@/lib/validation";

const dateInput = z
  .string()
  .optional()
  .transform((s) => parseDateInput(s));

const projectSchema = z
  .object({
    clientId: z.string().min(1, "Choose a client"),
    name: z.string().trim().min(1, "Give the project a name").max(160),
    description: v.optionalText(5000),
    status: z.enum(ProjectStatus),
    startDate: dateInput,
    dueDate: dateInput,
  })
  .refine((p) => !p.startDate || !p.dueDate || p.dueDate >= p.startDate, {
    path: ["dueDate"],
    message: "Due date must be after the start date",
  });

export async function createProject(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireTeam();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const client = await db.client.findFirst({ where: { id: parsed.data.clientId, agencyId: viewer.agency.id } });
  if (!client) return { fieldErrors: { clientId: "Choose a client" } };

  const project = await db.project.create({
    data: { ...parsed.data, agencyId: viewer.agency.id, createdById: viewer.user.id },
  });
  await logActivity({
    agencyId: viewer.agency.id,
    actorId: viewer.user.id,
    clientId: client.id,
    projectId: project.id,
    message: `${viewer.user.name} started project ${project.name}`,
    href: `/projects/${project.id}`,
  });
  redirect(`/projects/${project.id}`);
}

export async function updateProject(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireTeam();
  const id = String(formData.get("projectId"));
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const client = await db.client.findFirst({ where: { id: parsed.data.clientId, agencyId: viewer.agency.id } });
  if (!client) return { fieldErrors: { clientId: "Choose a client" } };
  const { count } = await db.project.updateMany({ where: { id, agencyId: viewer.agency.id }, data: parsed.data });
  if (!count) return { error: "Project not found." };
  revalidatePath(`/projects/${id}`);
  return { success: "Project saved." };
}

export async function setProjectStatus(formData: FormData) {
  const viewer = await requireTeam();
  const id = String(formData.get("projectId"));
  const status = z.enum(ProjectStatus).parse(formData.get("status"));
  const project = await db.project.findFirst({ where: { id, agencyId: viewer.agency.id } });
  if (!project || project.status === status) return;
  await db.project.update({ where: { id }, data: { status } });
  await logActivity({
    agencyId: viewer.agency.id,
    actorId: viewer.user.id,
    clientId: project.clientId,
    projectId: id,
    message: `${viewer.user.name} moved ${project.name} to ${PROJECT_STATUS[status].label}`,
    href: `/projects/${id}`,
  });
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  const viewer = await requireTeam();
  const id = String(formData.get("projectId"));
  const files = await db.file.findMany({ where: { deliverable: { project: { id, agencyId: viewer.agency.id } } } });
  const { count } = await db.project.deleteMany({ where: { id, agencyId: viewer.agency.id } });
  if (count) await Promise.all(files.map((f) => removeObject(f.storageKey)));
  redirect("/projects");
}

/* ------------------------------ Deliverables ----------------------------- */

const reviewSchema = z.object({
  deliverableId: z.string().min(1),
  decision: z.enum(["approve", "changes"]),
  note: v.optionalText(2000),
});

/** Client approves a deliverable or asks for changes. */
export async function reviewDeliverable(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  if (viewer.isTeam) return { error: "Only clients can review deliverables." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { deliverableId, decision, note } = parsed.data;
  if (decision === "changes" && !note) return { fieldErrors: { note: "Tell the team what you'd like changed." } };

  const deliverable = await db.deliverable.findFirst({
    where: { id: deliverableId, project: projectScope(viewer) },
    include: { project: true },
  });
  if (!deliverable) return { error: "Deliverable not found." };

  const status = decision === "approve" ? "APPROVED" : "CHANGES_REQUESTED";
  await db.deliverable.update({
    where: { id: deliverableId },
    data: { status, reviewNote: note, reviewedById: viewer.user.id, reviewedAt: new Date() },
  });

  const verb = decision === "approve" ? "approved" : "requested changes on";
  const href = `/projects/${deliverable.projectId}`;
  await logActivity({
    agencyId: viewer.agency.id,
    actorId: viewer.user.id,
    clientId: deliverable.project.clientId,
    projectId: deliverable.projectId,
    message: `${viewer.user.name} ${verb} “${deliverable.title}”`,
    href,
  });
  await sendMail({
    to: await teamEmails(viewer.agency.id),
    subject: `${viewer.user.name} ${verb} “${deliverable.title}”`,
    heading: decision === "approve" ? "Deliverable approved" : "Changes requested",
    body: [
      `${viewer.user.name} ${verb} “${deliverable.title}” on ${deliverable.project.name}.`,
      ...(note ? [`“${note}”`] : []),
    ],
    cta: { label: "Open project", href: appUrl(href) },
  });
  revalidatePath(href);
  return { success: decision === "approve" ? "Approved — thanks!" : "Your feedback was sent to the team." };
}

export async function deleteDeliverable(formData: FormData) {
  const viewer = await requireTeam();
  const id = String(formData.get("deliverableId"));
  const deliverable = await db.deliverable.findFirst({
    where: { id, project: { agencyId: viewer.agency.id } },
    include: { files: true },
  });
  if (!deliverable) return;
  await db.deliverable.delete({ where: { id } });
  await Promise.all(deliverable.files.map((f) => removeObject(f.storageKey)));
  revalidatePath(`/projects/${deliverable.projectId}`);
}

export async function deleteFile(formData: FormData) {
  const viewer = await requireTeam();
  const id = String(formData.get("fileId"));
  const file = await db.file.findFirst({
    where: { id, deliverable: { project: { agencyId: viewer.agency.id } } },
    include: { deliverable: true },
  });
  if (!file) return;
  await db.file.delete({ where: { id } });
  await removeObject(file.storageKey);
  revalidatePath(`/projects/${file.deliverable.projectId}`);
}
