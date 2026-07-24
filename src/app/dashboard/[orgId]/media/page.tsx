"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Media = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export default function MediaPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/orgs/${orgId}/media`)).json();
    setMedia(d.media || []);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/orgs/${orgId}/media`, { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) setError((await res.json()).error || "Upload failed");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media library</h1>
        <label className="btn-primary cursor-pointer">
          {uploading ? "Uploading…" : "⬆️ Upload"}
          <input type="file" className="hidden" accept="image/*,video/*" onChange={upload} disabled={uploading} />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {media.length === 0 && (
          <div className="col-span-full card p-8 text-center text-sm text-slate-500">
            No media yet. Upload images and videos to reuse them in posts.
          </div>
        )}
        {media.map((m) => (
          <div key={m.id} className="card overflow-hidden">
            {m.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.fileName} className="h-32 w-full object-cover" />
            ) : (
              <div className="h-32 w-full grid place-items-center bg-slate-900 text-white text-3xl">🎬</div>
            )}
            <div className="p-2 text-xs">
              <div className="truncate font-medium">{m.fileName}</div>
              <div className="text-slate-400">{(m.sizeBytes / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
