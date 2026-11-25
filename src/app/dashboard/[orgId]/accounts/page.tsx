"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PROVIDER_META } from "@/lib/ui";

type Account = {
  id: string;
  provider: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
};

const ALL_PROVIDERS = ["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"];

export default function AccountsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const search = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [canManage, setCanManage] = useState(true);
  const oauthError = search.get("error");
  const connected = search.get("connected");

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/orgs/${orgId}/accounts`)).json();
    setAccounts(d.accounts || []);
    setCanManage(d.canManage !== false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function disconnect(id: string) {
    if (!confirm("Disconnect this account? Scheduled posts targeting it will fail.")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) alert(res.status === 403 ? "You need admin access to disconnect accounts." : "Could not disconnect this account.");
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Social accounts</h1>
      <p className="text-sm text-slate-500 mt-1">
        Connect the pages and profiles this workspace publishes to.
      </p>

      {connected && (
        <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
          ✓ Connected {connected} account{connected === "1" ? "" : "s"} successfully.
        </div>
      )}
      {oauthError && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {oauthError === "provider_not_configured"
            ? `The ${search.get("provider")} app keys are not configured yet. Add them to your .env file (see .env.example) and restart the server.`
            : oauthError === "admin_required"
            ? "You need admin access in this workspace to connect accounts. Ask a workspace owner or admin to upgrade your role."
            : `Connection failed: ${oauthError}`}
        </div>
      )}
      {!canManage && !oauthError && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          Only workspace admins and owners can connect or disconnect accounts.
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {ALL_PROVIDERS.map((key) => {
          const meta = PROVIDER_META[key];
          const list = accounts.filter((a) => a.provider === key);
          return (
            <div key={key} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-xl">{meta.icon}</span> {meta.label}
                </div>
                {canManage && (
                  <a href={`/api/oauth/${key}/start?orgId=${orgId}`} className="btn-secondary !py-1.5 text-xs">
                    + Connect
                  </a>
                )}
              </div>
              {list.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {list.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 text-sm">
                      {a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-slate-200 grid place-items-center text-xs">
                          {a.displayName[0]}
                        </div>
                      )}
                      <span className="flex-1 truncate">{a.displayName}</span>
                      <span className={`badge ${a.status === "connected" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                        {a.status}
                      </span>
                      {canManage && (
                        <button onClick={() => disconnect(a.id)} className="text-xs text-slate-400 hover:text-red-600">
                          Disconnect
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
