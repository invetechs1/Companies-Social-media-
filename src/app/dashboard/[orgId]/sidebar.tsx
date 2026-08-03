"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const nav = [
  { href: "", label: "Overview", icon: "📊" },
  { href: "/composer", label: "New post", icon: "✍️" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/posts", label: "Posts", icon: "📄" },
  { href: "/approvals", label: "Approvals", icon: "✅" },
  { href: "/accounts", label: "Social accounts", icon: "🔗" },
  { href: "/media", label: "Media library", icon: "🖼️" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/team", label: "Team", icon: "👥" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({
  org,
  orgs,
  user,
}: {
  org: { id: string; name: string; brandColor: string; logoUrl: string | null };
  orgs: { id: string; name: string }[];
  user: { name: string; isSuperAdmin: boolean };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/dashboard/${org.id}`;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <img src="/brand/icon-256.png" alt="" className="h-10 w-10" />
          <span className="font-semibold truncate">Bassir Social Pro</span>
        </div>
        <select
          className="input mt-3"
          value={org.id}
          onChange={(e) => router.push(`/dashboard/${e.target.value}`)}
        >
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map((item) => {
          const href = `${base}${item.href}`;
          const active = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        {user.isSuperAdmin && (
          <Link
            href="/dashboard/admin/tenants"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname.startsWith("/dashboard/admin") ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>🏢</span>
            Tenants (resell)
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200 flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium truncate">{user.name}</div>
          {user.isSuperAdmin && <div className="text-xs text-slate-500">Platform owner</div>}
        </div>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-900">Sign out</button>
      </div>
    </aside>
  );
}
