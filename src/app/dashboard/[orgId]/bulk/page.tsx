"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Row = { datetime: string; text: string; platforms: string; mediaUrl?: string; error?: string };

const PROVIDERS = ["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"];

/** Minimal CSV parser: handles quoted fields and commas inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((x) => x.trim() !== "")) rows.push(row); }
  return rows;
}

export default function BulkPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);

  function load(text: string) {
    setError("");
    setResult("");
    const parsed = parseCsv(text);
    if (parsed.length === 0) return setRows([]);
    // Detect & drop a header row if present.
    const first = parsed[0].map((c) => c.toLowerCase().trim());
    const hasHeader = first.includes("text") || first.includes("datetime") || first.includes("date");
    const dataRows = hasHeader ? parsed.slice(1) : parsed;
    const out: Row[] = dataRows.map((cols) => {
      const [datetime = "", text = "", platforms = "", mediaUrl = ""] = cols;
      const plats = platforms.split(/[|;]/).map((p) => p.trim().toLowerCase()).filter(Boolean);
      const bad = plats.filter((p) => !PROVIDERS.includes(p));
      let rowError = "";
      if (!text.trim()) rowError = "Missing text";
      else if (plats.length === 0) rowError = "No platforms";
      else if (bad.length) rowError = `Unknown platform: ${bad.join(", ")}`;
      else if (datetime.trim() && isNaN(new Date(datetime).getTime())) rowError = "Bad date";
      return { datetime: datetime.trim(), text: text.trim(), platforms: plats.join(", "), mediaUrl: mediaUrl.trim() || undefined, error: rowError };
    });
    setRows(out);
  }

  async function submit() {
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) return setError("No valid rows to schedule.");
    setSaving(true);
    setError("");
    const posts = valid.map((r) => ({
      body: r.text,
      scheduledAt: r.datetime ? new Date(r.datetime).toISOString() : null,
      providers: r.platforms.split(",").map((p) => p.trim()),
      mediaUrl: r.mediaUrl,
    }));
    const res = await fetch(`/api/orgs/${orgId}/posts/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posts }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) return setError(d.error || "Bulk upload failed");
    setResult(`Scheduled ${d.created} post${d.created === 1 ? "" : "s"}.${d.errors?.length ? ` ${d.errors.length} row(s) skipped.` : ""}`);
    if (d.created > 0) setTimeout(() => router.push(`/dashboard/${orgId}/calendar`), 1400);
  }

  const validCount = rows.filter((r) => !r.error).length;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Bulk schedule</h1>
      <p className="text-sm text-slate-500 mt-1">Upload a CSV to schedule many posts at once.</p>

      <div className="card p-5 mt-6">
        <h2 className="text-sm font-semibold text-slate-700">CSV format</h2>
        <p className="text-xs text-slate-500 mt-1">
          Columns: <code>datetime, text, platforms, mediaUrl</code> (a header row is optional).
          <br />
          <strong>datetime</strong>: e.g. <code>2026-08-01 14:30</code> (empty = save as draft). &nbsp;
          <strong>platforms</strong>: one or more of {PROVIDERS.join(", ")}, separated by <code>|</code>.
        </p>
        <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto">datetime,text,platforms,mediaUrl
2026-08-01 09:00,عرض الصيف الكبير 🎉,facebook|instagram,
2026-08-02 18:30,Weekend sale — up to 40% off,twitter|facebook,</pre>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <label className="btn-secondary cursor-pointer">
            📎 Choose CSV file
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) f.text().then(load);
            }} />
          </label>
          <span className="text-xs text-slate-400">or paste below</span>
        </div>
        <textarea
          className="input mt-3 min-h-[120px] font-mono text-xs"
          placeholder="Paste CSV rows here…"
          onChange={(e) => load(e.target.value)}
        />
      </div>

      {rows.length > 0 && (
        <div className="card mt-4 overflow-x-auto">
          <div className="p-3 text-sm font-semibold border-b border-slate-200">
            Preview — {validCount} valid, {rows.length - validCount} with issues
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="p-2">When</th><th className="p-2">Text</th><th className="p-2">Platforms</th><th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2 whitespace-nowrap text-xs">{r.datetime || <span className="text-slate-400">draft</span>}</td>
                  <td className="p-2 max-w-sm truncate">{r.text}</td>
                  <td className="p-2 text-xs">{r.platforms}</td>
                  <td className="p-2">
                    {r.error
                      ? <span className="badge bg-red-100 text-red-700 text-xs">{r.error}</span>
                      : <span className="badge bg-emerald-100 text-emerald-800 text-xs">ok</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {result && <p className="mt-4 text-sm text-emerald-700">{result}</p>}

      <div className="mt-6">
        <button className="btn-primary" onClick={submit} disabled={saving || validCount === 0}>
          {saving ? "Scheduling…" : `Schedule ${validCount} post${validCount === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
