/** POSTs multipart form data with upload progress (fetch can't report it). */
export function uploadWithProgress(url: string, body: FormData, onProgress: (fraction: number) => void) {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true });
      let error = "Upload failed. Please try again.";
      try {
        error = JSON.parse(xhr.responseText).error ?? error;
      } catch {}
      resolve({ ok: false, error });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Network error. Check your connection and try again." });
    xhr.send(body);
  });
}
