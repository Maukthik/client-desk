import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getPortalViewer } from "@/lib/dal";
import { announceForReview, readUploads, storeFiles } from "@/lib/uploads";

/** Uploads a new version (additional files) to a deliverable and re-opens it for review. */
export async function POST(request: Request, ctx: RouteContext<"/api/deliverables/[id]/files">) {
  const viewer = await getPortalViewer();
  if (!viewer?.isTeam) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const deliverable = await db.deliverable.findFirst({
    where: { id, project: { agencyId: viewer.agency.id } },
    include: { project: true },
  });
  if (!deliverable) return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });

  const uploads = readUploads(await request.formData());
  if ("error" in uploads) return NextResponse.json({ error: uploads.error }, { status: 413 });
  if (uploads.files.length === 0) return NextResponse.json({ error: "Choose at least one file" }, { status: 400 });

  try {
    await storeFiles(uploads.files, { agencyId: viewer.agency.id, deliverableId: id, userId: viewer.user.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  await db.deliverable.update({
    where: { id },
    data: { status: "PENDING_REVIEW", reviewNote: null, reviewedAt: null, reviewedById: null },
  });
  await announceForReview({
    agencyId: viewer.agency.id,
    agencyName: viewer.agency.name,
    actor: viewer.user,
    project: deliverable.project,
    deliverableTitle: deliverable.title,
    isNewVersion: true,
  });
  revalidatePath(`/projects/${deliverable.projectId}`);
  return NextResponse.json({ ok: true }, { status: 201 });
}
