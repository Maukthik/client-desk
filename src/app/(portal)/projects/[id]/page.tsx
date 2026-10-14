import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Eye, FileText, FileImage, FileVideo, FileArchive, Inbox, Receipt, Trash2 } from "lucide-react";
import { deleteDeliverable, deleteFile, deleteProject } from "@/app/actions/projects";
import { ActivityFeed } from "@/components/activity-feed";
import { NewDeliverable } from "@/components/deliverables/new-deliverable";
import { ReviewForm } from "@/components/deliverables/review-form";
import { UploadVersion } from "@/components/deliverables/upload-version";
import { InvoiceTable } from "@/components/invoice-table";
import { ProjectForm } from "@/components/project-form";
import { DeliverableBadge, ProjectBadge } from "@/components/status-badges";
import { StatusSelect } from "@/components/status-select";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DescriptionList, EmptyState, PageHeader } from "@/components/ui/misc";
import { invoiceScope, projectScope, requireViewer } from "@/lib/dal";
import { db } from "@/lib/db";
import { MAX_UPLOAD_BYTES } from "@/lib/storage";
import { cn, formatBytes, formatDate, formatRelative, toDateInput } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/projects/[id]">): Promise<Metadata> {
  const viewer = await requireViewer();
  const { id } = await params;
  const project = await db.project.findFirst({ where: { id, ...projectScope(viewer) }, select: { name: true } });
  return { title: project?.name ?? "Project" };
}

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (/zip|compressed|tar|rar/.test(mime)) return FileArchive;
  return FileText;
}

const PREVIEWABLE = /^(image\/(png|jpeg|gif|webp)|application\/pdf|video\/mp4|text\/plain)$/;

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, ...projectScope(viewer) },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      deliverables: {
        orderBy: { createdAt: "desc" },
        include: {
          files: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
          reviewedBy: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      },
    },
  });
  if (!project) notFound();

  const [invoices, activity, clients] = await Promise.all([
    db.invoice.findMany({
      where: { ...invoiceScope(viewer), projectId: project.id },
      orderBy: { issueDate: "desc" },
      include: { client: { select: { name: true } }, project: { select: { name: true } } },
    }),
    db.activity.findMany({
      // Clients only see activity tied to their company (e.g. not internal drafts).
      where: { projectId: project.id, ...(viewer.clientId ? { clientId: viewer.clientId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true } } },
    }),
    viewer.isTeam
      ? db.client.findMany({ where: { agencyId: viewer.agency.id }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const approved = project.deliverables.filter((d) => d.status === "APPROVED").length;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Link href="/projects" className="hover:text-zinc-800">Projects</Link>
            <span className="text-zinc-300">/</span>
            {viewer.isTeam ? (
              <Link href={`/clients/${project.client.id}`} className="hover:text-zinc-800">{project.client.name}</Link>
            ) : (
              <span>{project.client.name}</span>
            )}
          </span>
        }
        title={project.name}
        description={project.description}
        actions={
          viewer.isTeam ? (
            <>
              <StatusSelect projectId={project.id} status={project.status} />
              <ButtonLink href={`/invoices/new?clientId=${project.clientId}&projectId=${project.id}`} variant="secondary">
                <Receipt /> Invoice
              </ButtonLink>
            </>
          ) : (
            <ProjectBadge status={project.status} />
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Deliverables"
              description={`${approved} of ${project.deliverables.length} approved`}
              action={viewer.isTeam && <NewDeliverable projectId={project.id} maxBytes={MAX_UPLOAD_BYTES} />}
            />
            {project.deliverables.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No deliverables yet"
                description={
                  viewer.isTeam
                    ? "Share files with the client for review. They'll get an email and can approve or request changes."
                    : "Files will appear here when the team shares work for your review."
                }
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {project.deliverables.map((d) => (
                  <li key={d.id} id={d.id} className="space-y-4 px-5 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-zinc-900">{d.title}</h3>
                          <DeliverableBadge status={d.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Shared by {d.createdBy.name} · {formatRelative(d.createdAt)}
                        </p>
                      </div>
                      {viewer.isTeam && (
                        <div className="flex items-center gap-1">
                          <UploadVersion deliverableId={d.id} maxBytes={MAX_UPLOAD_BYTES} />
                          <form action={deleteDeliverable}>
                            <input type="hidden" name="deliverableId" value={d.id} />
                            <ConfirmButton size="icon" message={`Delete “${d.title}” and all of its files?`} aria-label={`Delete ${d.title}`}>
                              <Trash2 />
                            </ConfirmButton>
                          </form>
                        </div>
                      )}
                    </div>

                    {d.description && <p className="text-sm whitespace-pre-line text-zinc-600">{d.description}</p>}

                    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
                      {d.files.map((file, index) => {
                        const Icon = fileIcon(file.mimeType);
                        return (
                          <li key={file.id} className={cn("flex items-center gap-3 px-3 py-2.5", index === 0 && "bg-zinc-50/60")}>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-zinc-500 ring-1 ring-zinc-200">
                              <Icon className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-zinc-800">{file.name}</p>
                              <p className="text-xs text-zinc-500">
                                {formatBytes(file.size)} · {file.uploadedBy.name} · {formatDate(file.createdAt)}
                              </p>
                            </div>
                            {PREVIEWABLE.test(file.mimeType) && (
                              <ButtonLink href={`/api/files/${file.id}?inline=1`} target="_blank" prefetch={false} variant="ghost" size="icon" aria-label={`Preview ${file.name}`}>
                                <Eye />
                              </ButtonLink>
                            )}
                            <ButtonLink href={`/api/files/${file.id}`} prefetch={false} variant="ghost" size="icon" aria-label={`Download ${file.name}`}>
                              <Download />
                            </ButtonLink>
                            {viewer.isTeam && (
                              <form action={deleteFile}>
                                <input type="hidden" name="fileId" value={file.id} />
                                <ConfirmButton size="icon" message={`Delete ${file.name}?`} aria-label={`Delete ${file.name}`}>
                                  <Trash2 />
                                </ConfirmButton>
                              </form>
                            )}
                          </li>
                        );
                      })}
                      {d.files.length === 0 && <li className="px-3 py-2.5 text-sm text-zinc-500">No files.</li>}
                    </ul>

                    {d.reviewedAt && d.reviewedBy && (
                      <div
                        className={cn(
                          "rounded-lg border px-4 py-3 text-sm",
                          d.status === "APPROVED" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900",
                        )}
                      >
                        <p className="font-medium">
                          {d.status === "APPROVED" ? "Approved" : "Changes requested"} by {d.reviewedBy.name} · {formatRelative(d.reviewedAt)}
                        </p>
                        {d.reviewNote && <p className="mt-1 whitespace-pre-line opacity-90">{d.reviewNote}</p>}
                      </div>
                    )}

                    {!viewer.isTeam && d.status === "PENDING_REVIEW" && <ReviewForm deliverableId={d.id} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {invoices.length > 0 && (
            <Card>
              <CardHeader title="Invoices" />
              <InvoiceTable invoices={invoices} showClient={false} />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Overview" />
            <CardBody className="py-2">
              <DescriptionList
                items={[
                  { label: "Status", value: <ProjectBadge status={project.status} /> },
                  { label: "Client", value: project.client.name },
                  { label: "Start date", value: formatDate(project.startDate) },
                  { label: "Due date", value: formatDate(project.dueDate) },
                  { label: "Created by", value: project.createdBy.name },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <ActivityFeed items={activity} />
          </Card>

          {viewer.isTeam && (
            <>
              <Card>
                <CardHeader title="Edit project" />
                <CardBody>
                  <ProjectForm
                    compact
                    clients={clients}
                    project={{
                      id: project.id,
                      clientId: project.clientId,
                      name: project.name,
                      description: project.description,
                      status: project.status,
                      startDate: toDateInput(project.startDate),
                      dueDate: toDateInput(project.dueDate),
                    }}
                  />
                </CardBody>
              </Card>
              <Card className="border-red-200">
                <CardHeader title="Delete project" description="Deletes all deliverables and files. Invoices are kept." />
                <CardBody>
                  <form action={deleteProject}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <ConfirmButton variant="danger" message={`Permanently delete ${project.name} and all of its files?`}>
                      <Trash2 /> Delete project
                    </ConfirmButton>
                  </form>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
