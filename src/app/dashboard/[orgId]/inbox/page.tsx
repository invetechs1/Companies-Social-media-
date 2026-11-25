"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PROVIDER_META, fmtDate } from "@/lib/ui";

type Item = {
  commentId: string;
  provider: string;
  accountId: string;
  accountName: string;
  postId: string;
  postBody: string;
  from: string;
  text: string;
  createdAt?: string;
};

export default function InboxPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const d = await (await fetch(`/api/orgs/${orgId}/inbox`)).json();
    setItems(d.items || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function send(item: Item) {
    const text = (reply[item.commentId] || "").trim();
    if (!text) return;
    setBusy(item.commentId);
    setMsg("");
    const res = await fetch(`/api/orgs/${orgId}/inbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: item.accountId, commentId: item.commentId, message: text }),
    });
    const d = await res.json();
    setBusy("");
    if (!res.ok) return setMsg(d.error || "Reply failed");
    setReply((r) => ({ ...r, [item.commentId]: "" }));
    setMsg("Reply sent ✓");
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-slate-500 text-sm mt-1">Comments on your recent Facebook &amp; Instagram posts.</p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}>{loading ? "Loading…" : "↻ Refresh"}</button>
      </div>

      {msg && <p className="mt-3 text-sm text-slate-600">{msg}</p>}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="card p-8 text-center text-sm text-slate-500">Loading comments…</div>
        ) : items.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">
            No comments yet. New comments on your published Facebook &amp; Instagram posts will appear here.
            <div className="text-xs text-slate-400 mt-2">
              (Other networks don&apos;t expose post comments on their basic API tiers.)
            </div>
          </div>
        ) : (
          items.map((item) => {
            const meta = PROVIDER_META[item.provider];
            return (
              <div key={item.commentId} className="card p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{meta?.icon}</span>
                  <span className="font-medium text-slate-700">{item.from}</span>
                  <span>· on {item.accountName}</span>
                  {item.createdAt && <span>· {fmtDate(item.createdAt)}</span>}
                </div>
                <p className="text-sm mt-1.5">{item.text}</p>
                <p className="text-xs text-slate-400 mt-1 truncate">↪ {item.postBody}</p>
                <div className="mt-3 flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Write a reply…"
                    value={reply[item.commentId] || ""}
                    onChange={(e) => setReply((r) => ({ ...r, [item.commentId]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") send(item); }}
                  />
                  <button className="btn-primary" onClick={() => send(item)} disabled={busy === item.commentId}>
                    {busy === item.commentId ? "Sending…" : "Reply"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
