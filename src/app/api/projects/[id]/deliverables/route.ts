import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getPortalViewer } from "@/lib/dal";
import { announceForReview, readUploads, storeFiles } from "@/lib/uploads";

const schema = z.object({
  title: z.string().trim().min(1, "Give the deliverable a title").max(200),
  description: z.string().trim().max(5000).optional(),
});

/** Creates a deliverable with its files (multipart/form-data). */
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/deliverables">) {
  const viewer = await getPortalViewer();
  if (!viewer?.isTeam) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const project = await db.project.findFirst({ where: { id, agencyId: viewer.agency.id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const formData = await request.formData();
  const parsed = schema.safeParse({ title: formData.get("title"), description: formData.get("description") || undefined });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]!.message }, { status: 400 });
  const uploads = readUploads(formData);
  if ("error" in uploads) return NextResponse.json({ error: uploads.error }, { status: 413 });
  if (uploads.files.length === 0) return NextResponse.json({ error: "Attach at least one file" }, { status: 400 });

  const deliverable = await db.deliverable.create({
    data: { projectId: project.id, title: parsed.data.title, description: parsed.data.description || null, createdById: viewer.user.id },
  });
  try {
    await storeFiles(uploads.files, { agencyId: viewer.agency.id, deliverableId: deliverable.id, userId: viewer.user.id });
  } catch (error) {
    await db.deliverable.delete({ where: { id: deliverable.id } });
    console.error(error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  // Sharing work for review moves a project out of planning automatically.
  if (project.status === "PLANNING" || project.status === "IN_PROGRESS") {
    await db.project.update({ where: { id: project.id }, data: { status: "IN_REVIEW" } });
  }
  await announceForReview({
    agencyId: viewer.agency.id,
    agencyName: viewer.agency.name,
    actor: viewer.user,
    project,
    deliverableTitle: deliverable.title,
    isNewVersion: false,
  });
  revalidatePath(`/projects/${project.id}`);
  return NextResponse.json({ id: deliverable.id }, { status: 201 });
}
