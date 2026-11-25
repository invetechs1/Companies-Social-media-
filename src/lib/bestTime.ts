/**
 * Best-time-to-post recommendations.
 *
 * We don't collect per-post engagement from the platforms, so (like Buffer /
 * Hootsuite do before an account has enough history) these are research-backed
 * general optimal windows per network, in the viewer's local timezone. They're
 * surfaced as suggestions the user can accept — not presented as the account's
 * own measured data.
 *
 * Each window is { day: 0-6 (Sun-Sat), hour: 0-23 }.
 */

type Window = { day: number; hour: number };

const WEEKDAYS = [1, 2, 3, 4]; // Mon–Thu, the generally strongest days

function windowsFor(provider: string): Window[] {
  switch (provider) {
    case "instagram":
      // Late morning + early evening on weekdays
      return WEEKDAYS.flatMap((day) => [{ day, hour: 11 }, { day, hour: 19 }]);
    case "facebook":
      // Early afternoon
      return WEEKDAYS.flatMap((day) => [{ day, hour: 13 }, { day, hour: 15 }]);
    case "twitter":
      // Morning commute + lunch
      return [1, 2, 3, 4, 5].flatMap((day) => [{ day, hour: 9 }, { day, hour: 12 }]);
    case "linkedin":
      // Business hours, mid-week strongest
      return [2, 3, 4].flatMap((day) => [{ day, hour: 8 }, { day, hour: 12 }, { day, hour: 17 }]);
    case "tiktok":
      // Evenings + weekend
      return [2, 4, 6].flatMap((day) => [{ day, hour: 18 }, { day, hour: 21 }]);
    case "youtube":
      // Weekend afternoons / weekday evenings
      return [4, 5, 6, 0].flatMap((day) => [{ day, hour: 17 }, { day, hour: 20 }]);
    default:
      return WEEKDAYS.flatMap((day) => [{ day, hour: 12 }]);
  }
}

/** Human-readable label for a window, e.g. "Tue 7:00 PM". */
export function windowLabel(w: Window): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const h12 = w.hour % 12 || 12;
  const ampm = w.hour < 12 ? "AM" : "PM";
  return `${days[w.day]} ${h12}:00 ${ampm}`;
}

/** The distinct recommended windows across the given providers, de-duplicated. */
export function recommendedWindows(providers: string[]): Window[] {
  const seen = new Set<string>();
  const out: Window[] = [];
  for (const p of providers) {
    for (const w of windowsFor(p)) {
      const key = `${w.day}-${w.hour}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(w);
      }
    }
  }
  return out.sort((a, b) => a.day - b.day || a.hour - b.hour);
}

/**
 * The soonest upcoming recommended slot across the selected providers, as a
 * Date in local time. Returns null if no providers given.
 */
export function nextBestSlot(providers: string[], from: Date = new Date()): Date | null {
  const windows = recommendedWindows(providers);
  if (windows.length === 0) return null;

  let best: Date | null = null;
  // Look ahead up to 7 days for the earliest matching window.
  for (let addDays = 0; addDays <= 7; addDays++) {
    const d = new Date(from);
    d.setDate(d.getDate() + addDays);
    const day = d.getDay();
    for (const w of windows) {
      if (w.day !== day) continue;
      const slot = new Date(d);
      slot.setHours(w.hour, 0, 0, 0);
      if (slot.getTime() > from.getTime() + 15 * 60 * 1000) {
        if (!best || slot < best) best = slot;
      }
    }
    if (best) break; // earliest day with any window wins
  }
  return best;
}
