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

const AUTH_ERROR_HINTS = [
  "unauthorized",
  "oauthexception",
  "access_token_invalid",
  "invalid_token",
  "expired",
];

/** Turns a raw provider error (often "[provider] {json}") into a short, human-readable message. */
export function friendlyError(raw: string | null | undefined): { message: string; isAuthError: boolean } {
  if (!raw) return { message: "", isAuthError: false };

  // Strip a leading "[provider] " prefix added by ProviderError.
  const withoutPrefix = raw.replace(/^\[[a-z]+\]\s*/i, "");

  // The remainder may itself have leading text before a JSON payload — pull out the JSON substring.
  const jsonStart = withoutPrefix.indexOf("{");
  const jsonEnd = withoutPrefix.lastIndexOf("}");
  let message = withoutPrefix;

  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(withoutPrefix.slice(jsonStart, jsonEnd + 1));
      message =
        parsed?.error?.message ||
        parsed?.detail ||
        parsed?.title ||
        parsed?.message ||
        withoutPrefix;
    } catch {
      // not valid JSON — use as-is
    }
  }

  const isAuthError = AUTH_ERROR_HINTS.some((hint) => raw.toLowerCase().includes(hint));
  return { message, isAuthError };
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
