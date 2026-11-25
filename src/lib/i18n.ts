/**
 * Lightweight i18n for the dashboard chrome. The interface language is stored
 * in a cookie ("locale") and flips the whole dashboard between LTR/English and
 * RTL/Arabic. This covers the persistent navigation and common labels; page
 * bodies can adopt t() incrementally.
 */

export type Locale = "en" | "ar";

const DICT: Record<string, { en: string; ar: string }> = {
  // navigation
  "nav.overview": { en: "Overview", ar: "نظرة عامة" },
  "nav.activity": { en: "Activity", ar: "الحركة" },
  "nav.composer": { en: "New post", ar: "منشور جديد" },
  "nav.bulk": { en: "Bulk schedule", ar: "جدولة مجمّعة" },
  "nav.calendar": { en: "Calendar", ar: "التقويم" },
  "nav.posts": { en: "Posts", ar: "المنشورات" },
  "nav.approvals": { en: "Approvals", ar: "الموافقات" },
  "nav.inbox": { en: "Inbox", ar: "الوارد" },
  "nav.accounts": { en: "Social accounts", ar: "الحسابات" },
  "nav.media": { en: "Media library", ar: "الوسائط" },
  "nav.bio": { en: "Link in bio", ar: "رابط البايو" },
  "nav.analytics": { en: "Analytics", ar: "التحليلات" },
  "nav.reports": { en: "Report", ar: "التقرير" },
  "nav.team": { en: "Team", ar: "الفريق" },
  "nav.settings": { en: "Settings", ar: "الإعدادات" },
  "nav.tenants": { en: "Tenants (resell)", ar: "المستأجرون (البيع)" },
  "nav.workspace": { en: "Workspace", ar: "مساحة العمل" },
  "nav.platformOwner": { en: "Platform owner", ar: "مالك المنصة" },
  "nav.signOut": { en: "Sign out", ar: "تسجيل الخروج" },
  "nav.language": { en: "العربية", ar: "English" }, // label shows the OTHER language
};

export function t(key: string, locale: Locale): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[locale] || entry.en;
}

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}

export function normalizeLocale(v: string | undefined | null): Locale {
  return v === "ar" ? "ar" : "en";
}
