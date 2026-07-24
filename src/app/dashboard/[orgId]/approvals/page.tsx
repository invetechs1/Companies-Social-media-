"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PROVIDER_META, fmtDate } from "@/lib/ui";

type Post = {
  id: string;
  body: string;
  scheduledAt: string | null;
  createdAt: string;
  author: { name: string };
  targets: { id: string; socialAccount: { provider: string; displayName: string } }[];
};

export default function ApprovalsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/orgs/${orgId}/posts?status=pending_approval`)).json();
    setPosts(d.posts || []);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function act(postId: string, action: "approve" | "reject") {
    const note = action === "reject" ? prompt("Reason for rejection (optional)") || undefined : undefined;
    setBusy(postId);
    await fetch(`/api/posts/${postId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    setBusy("");
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Approvals</h1>
      <p className="text-sm text-slate-500 mt-1">Posts waiting for a manager&apos;s sign-off.</p>

      <div className="mt-6 space-y-4">
        {posts.length === 0 && (
          <div className="card p-8 text-center text-sm text-slate-500">Nothing waiting for approval. 🎉</div>
        )}
        {posts.map((p) => (
          <div key={p.id} className="card p-5">
            <p className="text-sm whitespace-pre-wrap">{p.body}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span>by {p.author.name}</span>
              <span>{p.scheduledAt ? `wants to publish ${fmtDate(p.scheduledAt)}` : "publish on approval"}</span>
              <span className="flex gap-1">
                {p.targets.map((t) => (
                  <span key={t.id} title={t.socialAccount.displayName}>{PROVIDER_META[t.socialAccount.provider]?.icon}</span>
                ))}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="btn-primary !py-1.5 text-xs" onClick={() => act(p.id, "approve")} disabled={busy === p.id}>
                ✓ Approve
              </button>
              <button className="btn-danger !py-1.5 text-xs" onClick={() => act(p.id, "reject")} disabled={busy === p.id}>
                ✕ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
