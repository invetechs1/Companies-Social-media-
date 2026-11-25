"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { t, Locale } from "@/lib/i18n";

const nav = [
  { href: "", key: "nav.overview", icon: "📊" },
  { href: "/activity", key: "nav.activity", icon: "📡" },
  { href: "/composer", key: "nav.composer", icon: "✍️" },
  { href: "/bulk", key: "nav.bulk", icon: "📤" },
  { href: "/calendar", key: "nav.calendar", icon: "📅" },
  { href: "/posts", key: "nav.posts", icon: "📄" },
  { href: "/approvals", key: "nav.approvals", icon: "✅" },
  { href: "/inbox", key: "nav.inbox", icon: "💬" },
  { href: "/accounts", key: "nav.accounts", icon: "🔗" },
  { href: "/media", key: "nav.media", icon: "🖼️" },
  { href: "/bio", key: "nav.bio", icon: "🔖" },
  { href: "/analytics", key: "nav.analytics", icon: "📈" },
  { href: "/reports", key: "nav.reports", icon: "📑" },
  { href: "/team", key: "nav.team", icon: "👥" },
  { href: "/settings", key: "nav.settings", icon: "⚙️" },
];

export default function Sidebar({
  org,
  orgs,
  user,
  locale = "en",
}: {
  org: { id: string; name: string; brandColor: string; logoUrl: string | null };
  orgs: { id: string; name: string }[];
  user: { name: string; isSuperAdmin: boolean };
  locale?: Locale;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/dashboard/${org.id}`;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function toggleLanguage() {
    const next = locale === "ar" ? "en" : "ar";
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  const borderSide = locale === "ar" ? "border-l" : "border-r";

  return (
    <aside className={`w-64 shrink-0 bg-white ${borderSide} border-slate-200 flex flex-col`}>
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
              {t(item.key, locale)}
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
            {t("nav.tenants", locale)}
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <button
          onClick={toggleLanguage}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          🌐 {t("nav.language", locale)}
        </button>
      </div>

      <div className="p-4 border-t border-slate-200 flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium truncate">{user.name}</div>
          {user.isSuperAdmin && <div className="text-xs text-slate-500">{t("nav.platformOwner", locale)}</div>}
        </div>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-900">{t("nav.signOut", locale)}</button>
      </div>
    </aside>
  );
}
