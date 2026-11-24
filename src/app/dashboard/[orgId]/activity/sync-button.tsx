"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Triggers a live analytics pull for this workspace, then refreshes the page. */
export default function SyncButton({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sync() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/metrics/sync`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Sync failed");
      setMsg(d.synced > 0 ? `Updated ${d.synced} account${d.synced === 1 ? "" : "s"}` : "No new data");
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
      <button className="btn-secondary" onClick={sync} disabled={busy}>
        {busy ? "Syncing…" : "↻ Refresh data"}
      </button>
    </div>
  );
}
