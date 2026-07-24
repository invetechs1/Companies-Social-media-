"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PROVIDER_META } from "@/lib/ui";

type Account = { id: string; provider: string; displayName: string; status: string };
type Media = { id: string; url: string; fileName: string; mimeType: string };

export default function ComposerPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [schedule, setSchedule] = useState("");
  const [requestApproval, setRequestApproval] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<"" | "draft" | "schedule" | "now">("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orgs/${orgId}/accounts`)
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []));
  }, [orgId]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/orgs/${orgId}/media`, { method: "POST", body: fd });
    setUploading(false);
    const d = await res.json();
    if (res.ok) setMediaUrls((m) => [...m, d.media.url]);
    else setError(d.error || "Upload failed");
  }

  async function save(mode: "draft" | "schedule" | "now") {
    setError("");
    if (selected.length === 0) return setError("Select at least one social account.");
    if (!body.trim()) return setError("Write something first.");
    if (mode === "schedule" && !schedule) return setError("Pick a date & time to schedule.");
    setSaving(mode);

    const res = await fetch(`/api/orgs/${orgId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        mediaUrls,
        socialAccountIds: selected,
        scheduledAt: mode === "schedule" ? new Date(schedule).toISOString() : null,
        requestApproval,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      setSaving("");
      return setError(d.error || "Failed to save");
    }

    if (mode === "now" && !requestApproval) {
      const pub = await fetch(`/api/posts/${d.post.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_now" }),
      });
      if (!pub.ok) {
        setSaving("");
        return setError((await pub.json()).error || "Publish failed");
      }
    }
    router.push(`/dashboard/${orgId}/posts`);
  }

  const charLimit = selected.some((id) => accounts.find((a) => a.id === id)?.provider === "twitter") ? 280 : 5000;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">New post</h1>

      <div className="card p-5 mt-6">
        <h2 className="text-sm font-semibold text-slate-700">Publish to</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">
            No social accounts connected yet.{" "}
            <a className="text-brand-600 hover:underline" href={`/dashboard/${orgId}/accounts`}>Connect accounts →</a>
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {accounts.map((a) => {
              const meta = PROVIDER_META[a.provider];
              const on = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className={`badge border px-3 py-1.5 ${on ? "bg-brand-50 border-brand-400 text-brand-700" : "bg-white border-slate-300 text-slate-600"}`}
                >
                  {meta?.icon} {a.displayName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-5 mt-4">
        <textarea
          className="input min-h-[160px]"
          placeholder="What do you want to share?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={charLimit}
        />
        <div className="mt-1 text-xs text-slate-400 text-right">{body.length}/{charLimit}</div>

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <label className="btn-secondary cursor-pointer">
            {uploading ? "Uploading…" : "📎 Add image/video"}
            <input type="file" className="hidden" accept="image/*,video/*" onChange={upload} disabled={uploading} />
          </label>
          {mediaUrls.map((u) => (
            <span key={u} className="badge bg-slate-100 text-slate-700 gap-1">
              {u.split("/").pop()}
              <button onClick={() => setMediaUrls((m) => m.filter((x) => x !== u))} className="text-slate-400 hover:text-red-600">✕</button>
            </span>
          ))}
        </div>
      </div>

      <div className="card p-5 mt-4 space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700">Schedule (optional)</label>
          <input type="datetime-local" className="input mt-1 max-w-xs" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={requestApproval} onChange={(e) => setRequestApproval(e.target.checked)} />
          Require manager approval before publishing
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button className="btn-secondary" onClick={() => save("draft")} disabled={!!saving}>
          {saving === "draft" ? "Saving…" : "Save draft"}
        </button>
        <button className="btn-primary" onClick={() => save("schedule")} disabled={!!saving}>
          {saving === "schedule" ? "Scheduling…" : "Schedule"}
        </button>
        <button className="btn-primary" onClick={() => save("now")} disabled={!!saving || requestApproval}>
          {saving === "now" ? "Publishing…" : "Publish now"}
        </button>
      </div>
    </div>
  );
}
