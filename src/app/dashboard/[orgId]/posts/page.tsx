"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PROVIDER_META, STATUS_META, fmtDate } from "@/lib/ui";

type Post = {
  id: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  author: { name: string };
  targets: {
    id: string;
    status: string;
    errorMessage: string | null;
    socialAccount: { provider: string; displayName: string };
  }[];
};

const FILTERS = ["all", "draft", "pending_approval", "scheduled", "published", "failed"];

export default function PostsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const q = filter === "all" ? "" : `?status=${filter}`;
    const d = await (await fetch(`/api/orgs/${orgId}/posts${q}`)).json();
    setPosts(d.posts || []);
  }, [orgId, filter]);

  useEffect(() => { load(); }, [load]);

  async function act(postId: string, action: string) {
    setBusy(postId);
    await fetch(`/api/posts/${postId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy("");
    load();
  }

  async function remove(postId: string) {
    if (!confirm("Delete this post?")) return;
    setBusy(postId);
    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    setBusy("");
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Posts</h1>
      <div className="mt-4 flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`badge border px-3 py-1.5 capitalize ${filter === f ? "bg-brand-50 border-brand-400 text-brand-700" : "bg-white border-slate-300 text-slate-600"}`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-6 card divide-y divide-slate-100">
        {posts.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No posts found.</div>}
        {posts.map((p) => {
          const st = STATUS_META[p.status] || STATUS_META.draft;
          return (
            <div key={p.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap">{p.body}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span>by {p.author.name}</span>
                    {p.scheduledAt && <span>🕒 {fmtDate(p.scheduledAt)}</span>}
                    {p.publishedAt && <span>✅ {fmtDate(p.publishedAt)}</span>}
                    <span className="flex gap-1">
                      {p.targets.map((t) => (
                        <span key={t.id} title={`${t.socialAccount.displayName}: ${t.status}${t.errorMessage ? ` — ${t.errorMessage}` : ""}`}>
                          {PROVIDER_META[t.socialAccount.provider]?.icon}
                          {t.status === "failed" && "⚠️"}
                        </span>
                      ))}
                    </span>
                  </div>
                  {p.targets.some((t) => t.errorMessage) && (
                    <div className="mt-2 text-xs text-red-600">
                      {p.targets.filter((t) => t.errorMessage).map((t) => (
                        <div key={t.id}>{t.socialAccount.displayName}: {t.errorMessage}</div>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`badge ${st.className} shrink-0`}>{st.label}</span>
              </div>
              <div className="mt-3 flex gap-2">
                {["draft", "approved", "scheduled", "failed"].includes(p.status) && (
                  <button className="btn-primary !py-1 !px-3 text-xs" onClick={() => act(p.id, "publish_now")} disabled={busy === p.id}>
                    Publish now
                  </button>
                )}
                {p.status === "draft" && (
                  <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => act(p.id, "submit")} disabled={busy === p.id}>
                    Submit for approval
                  </button>
                )}
                {!["published", "publishing"].includes(p.status) && (
                  <button className="btn-danger !py-1 !px-3 text-xs" onClick={() => remove(p.id)} disabled={busy === p.id}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
