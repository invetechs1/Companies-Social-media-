"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setError((await res.json()).error || "Login failed");
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">S</div>
          <span className="font-semibold text-lg">Bassir Social Pro</span>
        </div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          No account? <Link href="/signup" className="text-brand-600 hover:underline">Start a free trial</Link>
        </p>
      </div>
    </main>
  );
}
