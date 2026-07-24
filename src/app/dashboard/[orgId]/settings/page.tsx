"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Org = {
  id: string;
  name: string;
  slug: string;
  brandColor: string;
  logoUrl: string | null;
  customDomain: string | null;
  plan: string;
  planStatus: string;
};

export default function SettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/orgs`)).json();
    const found = (d.organizations || []).find((o: Org) => o.id === orgId);
    setOrg(found || null);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: org.name,
        brandColor: org.brandColor,
        logoUrl: org.logoUrl || null,
        customDomain: org.customDomain || null,
      }),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved ✓" : (await res.json()).error || "Failed to save");
  }

  if (!org) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Workspace settings</h1>
      <p className="text-sm text-slate-500 mt-1">White-label branding for this workspace.</p>

      <form onSubmit={save} className="mt-6 card p-6 space-y-5">
        <div>
          <label className="text-sm font-medium">Company name</label>
          <input className="input mt-1" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Brand color</label>
          <div className="mt-1 flex items-center gap-3">
            <input type="color" value={org.brandColor} onChange={(e) => setOrg({ ...org, brandColor: e.target.value })} className="h-10 w-16 rounded cursor-pointer border border-slate-300" />
            <input className="input max-w-[140px]" value={org.brandColor} onChange={(e) => setOrg({ ...org, brandColor: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Logo URL</label>
          <input className="input mt-1" placeholder="https://…/logo.png" value={org.logoUrl || ""} onChange={(e) => setOrg({ ...org, logoUrl: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Custom domain</label>
          <input className="input mt-1" placeholder="social.yourcompany.com" value={org.customDomain || ""} onChange={(e) => setOrg({ ...org, customDomain: e.target.value })} />
          <p className="text-xs text-slate-400 mt-1">Point a CNAME at your deployment to serve this workspace under its own domain.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
          {msg && <span className="text-sm text-slate-600">{msg}</span>}
        </div>
      </form>

      <div className="mt-6 card p-6">
        <h2 className="font-semibold">Plan</h2>
        <p className="text-sm text-slate-600 mt-2">
          Current plan: <span className="badge bg-brand-50 text-brand-700 capitalize">{org.plan}</span>{" "}
          <span className="badge bg-slate-100 text-slate-600 capitalize ml-1">{org.planStatus}</span>
        </p>
        <p className="text-xs text-slate-400 mt-2">Plans are managed by the platform owner from the Tenants panel.</p>
      </div>
    </div>
  );
}
