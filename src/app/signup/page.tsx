"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setError((await res.json()).error || "Signup failed");
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <img src="/brand/icon-256.png" alt="" className="h-11 w-11" />
          <span className="font-semibold text-lg">Bassir Social Pro</span>
        </div>
        <h1 className="text-xl font-semibold">Create your workspace</h1>
        <p className="text-sm text-slate-500 mt-1">14-day free trial. No credit card required.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className="input" placeholder="Your name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <input className="input" placeholder="Company name" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          <input className="input" type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Creating…" : "Create workspace"}</button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Already have an account? <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
