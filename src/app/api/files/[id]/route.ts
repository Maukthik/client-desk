import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPortalViewer, projectScope } from "@/lib/dal";
import { getObject } from "@/lib/storage";

// Types safe to render inline in the browser. Anything else (HTML, SVG, ...)
// is always served as a download so uploaded files can't run script.
const INLINE_SAFE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "video/mp4", "text/plain"]);

export async function GET(request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const viewer = await getPortalViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  const file = await db.file.findFirst({ where: { id, deliverable: { project: projectScope(viewer) } } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let object;
  try {
    object = await getObject(file.storageKey);
  } catch {
    return NextResponse.json({ error: "File is missing from storage" }, { status: 410 });
  }

  const inline = new URL(request.url).searchParams.get("inline") === "1" && INLINE_SAFE.has(file.mimeType);
  const asciiName = file.name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(object.stream, {
    headers: {
      "Content-Type": inline ? file.mimeType : "application/octet-stream",
      "Content-Length": String(object.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
