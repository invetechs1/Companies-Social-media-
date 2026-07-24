export const colors = {
  accent: "#3564fb",
  accentSoft: "#e0e9fc",
  surface: "#f4f6fa",
  card: "#ffffff",
  ink: "#1a2233",
  ink2: "#5b6478",
  ink3: "#8a92a6",
  border: "#e3e7f0",
  good: "#0e7a4f",
  goodBg: "#ddf3e8",
  warn: "#8a5a00",
  warnBg: "#fbeecb",
  crit: "#b3261e",
  critBg: "#fbe2e0",
  info: "#1d4fb8",
  infoBg: "#e0e9fc",
};

export const PROVIDERS: Record<string, { label: string; color: string; glyph: string }> = {
  facebook: { label: "Facebook", color: "#1877F2", glyph: "f" },
  instagram: { label: "Instagram", color: "#C13584", glyph: "ig" },
  twitter: { label: "X (Twitter)", color: "#111111", glyph: "X" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", glyph: "in" },
  tiktok: { label: "TikTok", color: "#161823", glyph: "tt" },
  youtube: { label: "YouTube", color: "#CC0000", glyph: "yt" },
};

export const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  draft: { label: "Draft", fg: colors.ink2, bg: colors.surface },
  pending_approval: { label: "Awaiting approval", fg: colors.warn, bg: colors.warnBg },
  approved: { label: "Approved", fg: colors.info, bg: colors.infoBg },
  scheduled: { label: "Scheduled", fg: colors.info, bg: colors.infoBg },
  publishing: { label: "Publishing…", fg: colors.info, bg: colors.infoBg },
  published: { label: "Published", fg: colors.good, bg: colors.goodBg },
  failed: { label: "Failed", fg: colors.crit, bg: colors.critBg },
};
