"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadWithProgress } from "@/lib/upload-client";
import { formatBytes } from "@/lib/utils";

export function UploadVersion({ deliverableId, maxBytes }: { deliverableId: string; maxBytes: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onChange(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const tooBig = [...list].find((f) => f.size > maxBytes);
    if (tooBig) return setError(`${tooBig.name} is larger than ${formatBytes(maxBytes)}.`);
    const body = new FormData();
    [...list].forEach((f) => body.append("files", f));
    setProgress(0);
    const result = await uploadWithProgress(`/api/deliverables/${deliverableId}/files`, body, setProgress);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (!result.ok) return setError(result.error ?? "Upload failed.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => onChange(e.target.files)} />
      <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
        {progress !== null ? <Loader2 className="animate-spin" /> : <Upload />}
        {progress !== null ? `Uploading ${Math.round(progress * 100)}%` : "Upload new version"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
