"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Link = { id: string; title: string; url: string; order: number };

export default function BioPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [links, setLinks] = useState<Link[]>([]);
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [linksRes, orgsRes] = await Promise.all([
      fetch(`/api/orgs/${orgId}/bio-links`).then((r) => r.json()),
      fetch(`/api/orgs`).then((r) => r.json()),
    ]);
    setLinks(linksRes.links || []);
    const org = (orgsRes.organizations || []).find((o: any) => o.id === orgId);
    if (org) {
      setSlug(org.slug);
      setHeadline(org.bioHeadline || "");
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/orgs/${orgId}/bio-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url }),
    });
    const d = await res.json();
    if (!res.ok) return setError(d.error || "Failed to add");
    setTitle("");
    setUrl("");
    load();
  }

  async function removeLink(id: string) {
    await fetch(`/api/bio-links/${id}`, { method: "DELETE" });
    load();
  }

  async function saveHeadline() {
    setMsg("");
    const res = await fetch(`/api/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bioHeadline: headline || null }),
    });
    setMsg(res.ok ? "Saved ✓" : "Failed to save");
  }

  const publicUrl = typeof window !== "undefined" && slug ? `${window.location.origin}/l/${slug}` : "";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Link in bio</h1>
      <p className="text-sm text-slate-500 mt-1">A single public page of links to share in your social bios.</p>

      {publicUrl && (
        <div className="card p-4 mt-5 flex items-center gap-3 flex-wrap">
          <span className="text-sm">Your page: <a href={publicUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{publicUrl}</a></span>
          <button className="btn-secondary !py-1 text-xs" onClick={() => { navigator.clipboard?.writeText(publicUrl); setMsg("Copied ✓"); }}>Copy</button>
          <a className="btn-secondary !py-1 text-xs" href={publicUrl} target="_blank" rel="noreferrer">Open</a>
        </div>
      )}

      <div className="card p-5 mt-4">
        <label className="text-sm font-medium">Headline (optional)</label>
        <div className="mt-1 flex gap-2">
          <input className="input" placeholder="Shop our latest collections" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <button className="btn-secondary" onClick={saveHeadline}>Save</button>
        </div>
      </div>

      <div className="card mt-4">
        <div className="p-4 border-b border-slate-200 font-semibold text-sm">Links</div>
        <ul className="divide-y divide-slate-100">
          {links.length === 0 && <li className="p-4 text-sm text-slate-500">No links yet. Add one below.</li>}
          {links.map((l) => (
            <li key={l.id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{l.title}</div>
                <div className="text-xs text-slate-400 truncate">{l.url}</div>
              </div>
              <button className="btn-danger !py-1 !px-3 text-xs" onClick={() => removeLink(l.id)}>Delete</button>
            </li>
          ))}
        </ul>
        <form onSubmit={addLink} className="p-4 border-t border-slate-200 flex gap-2 flex-wrap">
          <input className="input flex-1 min-w-[120px]" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="input flex-1 min-w-[160px]" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <button className="btn-primary">Add link</button>
        </form>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {msg && <p className="mt-4 text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
