"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTenantForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brandColor, setBrandColor] = useState("#3564fb");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, brandColor }),
    });
    setSaving(false);
    if (!res.ok) return setError((await res.json()).error || "Failed");
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Onboard a new company</h2>
      <p className="text-xs text-slate-500 mt-1">Creates a fresh workspace you can hand over to a customer.</p>
      <div className="mt-4 flex gap-3">
        <input className="input flex-1" placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-14 rounded cursor-pointer border border-slate-300" />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button className="btn-primary mt-4 w-full" disabled={saving}>{saving ? "Creating…" : "Create workspace"}</button>
    </form>
  );
}
