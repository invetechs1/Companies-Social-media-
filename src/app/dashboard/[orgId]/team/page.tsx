"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Member = { id: string; role: string; user: { id: string; name: string; email: string } };

export default function TeamPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "editor" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/orgs/${orgId}/team`)).json();
    setMembers(d.members || []);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/orgs/${orgId}/team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) return setError((await res.json()).error || "Failed");
    setForm({ name: "", email: "", password: "", role: "editor" });
    load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Team</h1>
      <p className="text-sm text-slate-500 mt-1">
        Owners and admins approve posts; editors create content; viewers can only read.
      </p>

      <div className="mt-6 card divide-y divide-slate-100">
        {members.map((m) => (
          <div key={m.id} className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold">
              {m.user.name[0]}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{m.user.name}</div>
              <div className="text-xs text-slate-500">{m.user.email}</div>
            </div>
            <span className="badge bg-slate-100 text-slate-700 capitalize">{m.role}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 card p-5">
        <h2 className="font-semibold">Add team member</h2>
        <form onSubmit={invite} className="mt-4 grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Admin (can approve)</option>
            <option value="editor">Editor (creates content)</option>
            <option value="viewer">Viewer (read-only)</option>
          </select>
          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
          <button className="btn-primary md:col-span-2" disabled={saving}>{saving ? "Adding…" : "Add member"}</button>
        </form>
      </div>
    </div>
  );
}
