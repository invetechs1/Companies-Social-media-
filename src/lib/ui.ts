export const PROVIDER_META: Record<string, { label: string; icon: string; color: string }> = {
  facebook: { label: "Facebook", icon: "📘", color: "#1877F2" },
  instagram: { label: "Instagram", icon: "📸", color: "#E4405F" },
  twitter: { label: "X (Twitter)", icon: "🐦", color: "#111111" },
  linkedin: { label: "LinkedIn", icon: "💼", color: "#0A66C2" },
  tiktok: { label: "TikTok", icon: "🎵", color: "#69C9D0" },
  youtube: { label: "YouTube", icon: "▶️", color: "#FF0000" },
};

export const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  pending_approval: { label: "Awaiting approval", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", className: "bg-sky-100 text-sky-800" },
  scheduled: { label: "Scheduled", className: "bg-indigo-100 text-indigo-800" },
  publishing: { label: "Publishing…", className: "bg-blue-100 text-blue-800" },
  published: { label: "Published", className: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
};

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
