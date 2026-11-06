/**
 * Frozen "now" for the whole concept: 6 November 2026, 12:00 MSK.
 * Every mock timestamp is derived from it so SSR and hydration match.
 */
export const NOW = new Date("2026-11-06T09:00:00.000Z");
export const NOW_MS = NOW.getTime();

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const MSK = 3 * HOUR;

/** Start of the MSK day `n` days ago, as epoch ms. */
export function mskDayStart(daysAgo = 0) {
  const shifted = NOW_MS + MSK;
  const dayStart = shifted - (shifted % DAY);
  return dayStart - MSK - daysAgo * DAY;
}

/** ISO string for an MSK wall-clock time `daysAgo` days ago. */
export function daysAgo(n: number, hour = 12, minute = 0, second = 0) {
  return new Date(mskDayStart(n) + hour * HOUR + minute * MINUTE + second * 1000).toISOString();
}

/** ISO string `ms` milliseconds before NOW. */
export function ago(ms: number) {
  return new Date(NOW_MS - ms).toISOString();
}

/** ISO string `ms` milliseconds after NOW. */
export function later(ms: number) {
  return new Date(NOW_MS + ms).toISOString();
}

/** ISO for an MSK calendar date: msk(2026, 11, 27, 18) → 27 Nov 2026 18:00 MSK */
export function msk(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - MSK).toISOString();
}
