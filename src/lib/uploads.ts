import "server-only";
import { randomUUID } from "node:crypto";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { db } from "./db";
import { logActivity } from "./activity";
import { sendMail } from "./mail";
import { clientContactEmails } from "./notify";
import { MAX_UPLOAD_BYTES, putObject, removeObject } from "./storage";
import { appUrl, formatBytes } from "./utils";

export function readUploads(formData: FormData) {
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
  if (tooBig) return { error: `${tooBig.name} is larger than the ${formatBytes(MAX_UPLOAD_BYTES)} limit.` } as const;
  return { files } as const;
}

/** Writes files to storage and records them. Cleans up written objects on failure. */
export async function storeFiles(files: File[], opts: { agencyId: string; deliverableId: string; userId: string }) {
  const written: string[] = [];
  try {
    for (const file of files) {
      const storageKey = `${opts.agencyId}/${opts.deliverableId}/${randomUUID()}`;
      await putObject(storageKey, file.stream() as unknown as WebReadableStream<Uint8Array>);
      written.push(storageKey);
      await db.file.create({
        data: {
          deliverableId: opts.deliverableId,
          name: file.name.slice(0, 255) || "file",
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          storageKey,
          uploadedById: opts.userId,
        },
      });
    }
  } catch (error) {
    await Promise.all(written.map((key) => removeObject(key)));
    await db.file.deleteMany({ where: { storageKey: { in: written } } });
    throw error;
  }
}

/** Tells a client's portal users that something is ready for their review. */
export async function announceForReview(opts: {
  agencyId: string;
  agencyName: string;
  actor: { id: string; name: string };
  project: { id: string; name: string; clientId: string };
  deliverableTitle: string;
  isNewVersion: boolean;
}) {
  const href = `/projects/${opts.project.id}`;
  await logActivity({
    agencyId: opts.agencyId,
    actorId: opts.actor.id,
    clientId: opts.project.clientId,
    projectId: opts.project.id,
    message: opts.isNewVersion
      ? `${opts.actor.name} uploaded a new version of “${opts.deliverableTitle}”`
      : `${opts.actor.name} shared “${opts.deliverableTitle}” for review`,
    href,
  });
  await sendMail({
    to: await clientContactEmails(opts.project.clientId),
    subject: `Ready for review: ${opts.deliverableTitle}`,
    heading: opts.isNewVersion ? "A new version is ready for review" : "A new deliverable is ready for review",
    body: [
      `${opts.agencyName} shared “${opts.deliverableTitle}” on ${opts.project.name}.`,
      "Download the files and approve them, or let the team know what you'd like changed.",
    ],
    cta: { label: "Review deliverable", href: appUrl(href) },
  });
}
