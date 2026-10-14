"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input, Textarea } from "@/components/ui/form";
import { uploadWithProgress } from "@/lib/upload-client";
import { cn, formatBytes } from "@/lib/utils";

export function NewDeliverable({ projectId, maxBytes }: { projectId: string; maxBytes: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = [...list];
    const tooBig = incoming.find((f) => f.size > maxBytes);
    if (tooBig) setError(`${tooBig.name} is larger than the ${formatBytes(maxBytes)} limit.`);
    setFiles((prev) => [...prev, ...incoming.filter((f) => f.size <= maxBytes)]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (files.length === 0) return setError("Attach at least one file.");
    const body = new FormData(e.currentTarget);
    body.delete("files");
    files.forEach((f) => body.append("files", f));
    setProgress(0);
    const result = await uploadWithProgress(`/api/projects/${projectId}/deliverables`, body, setProgress);
    setProgress(null);
    if (!result.ok) return setError(result.error ?? "Upload failed.");
    setFiles([]);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus /> New deliverable
      </Button>
    );
  }

  const uploading = progress !== null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="new-deliverable-title">
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 id="new-deliverable-title" className="font-semibold">Share a deliverable</h2>
          <button type="button" onClick={() => !uploading && setOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <FormAlert message={error} />
          <Field label="Title" htmlFor="title">
            <Input id="title" name="title" placeholder="Homepage design — round 1" required autoFocus disabled={uploading} />
          </Field>
          <Field label="Notes for the client" htmlFor="description">
            <Textarea id="description" name="description" rows={3} placeholder="What's included and what feedback you need." disabled={uploading} />
          </Field>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
              dragging ? "border-brand-500 bg-brand-50" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
            )}
          >
            <FileUp className="size-6 text-zinc-400" />
            <p className="mt-2 text-sm font-medium text-zinc-700">Drop files here or click to browse</p>
            <p className="text-xs text-zinc-500">Up to {formatBytes(maxBytes)} per file</p>
            <input ref={inputRef} type="file" name="files" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </div>
          {files.length > 0 && (
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-zinc-500 tabular-nums">{formatBytes(file.size)}</span>
                  {!uploading && (
                    <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-zinc-700" aria-label={`Remove ${file.name}`}>
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Uploading…</span>
                <span className="tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={uploading}>
            Share for review
          </Button>
        </div>
      </form>
    </div>
  );
}
