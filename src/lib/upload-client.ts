export type UploadResult = { url: string; error?: undefined } | { url?: undefined; error: string };

const CLIENT_LIMIT = 5 * 1024 * 1024;

/** Uploads an image and returns the URL to reference it by, or the reason it failed. */
export async function uploadImage(file: File): Promise<UploadResult> {
  // Checked here too, so a 40 MB photo fails at once instead of after the upload.
  if (file.size > CLIENT_LIMIT) return { error: 'სურათი 5 მბ-ზე მეტი არ უნდა იყოს.' };

  const body = new FormData();
  body.append('file', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && json.url) return { url: json.url };
    return { error: json.error ?? 'სურათის ატვირთვა ვერ მოხერხდა.' };
  } catch {
    return { error: 'კავშირი ვერ დამყარდა. სცადე თავიდან.' };
  }
}
