/**
 * One planner for every A/B duration on the page: the «Новый эксперимент» dialog,
 * draft cards, the launch toast and the running test's «день N из M».
 */

/** Visitors each variant needs before the result is worth reading. */
export const SAMPLE_PER_VARIANT = 4600;
const MIN_DAYS = 7; // always catch a weekend
const MAX_DAYS = 90;

/** Minimum test length for `perDay` visitors split A/B as `100 − splitB` / `splitB`. */
export function plannedDays(perDay: number, splitB = 50) {
  const minShare = Math.min(splitB, 100 - splitB) / 100;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.ceil(SAMPLE_PER_VARIANT / Math.max(1, perDay * minShare))));
}

/** Upper-tail standard normal quantile (Abramowitz–Stegun 26.2.23, error < 5·10⁻⁴). */
function zFor(p: number) {
  const q = 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));
  return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
}

/**
 * Days until «B лучше A» reaches 95 % if the observed effect holds: the z-score grows
 * with √n, so the sample has to grow by (z₉₅ / z_now)². `null` — no lead to confirm.
 */
export function daysTo95(probability: number, visitors: number, perDay: number) {
  if (probability >= 0.95) return 0;
  if (probability <= 0.5 || perDay <= 0) return null;
  const grow = (zFor(0.95) / zFor(probability)) ** 2 - 1;
  return Math.ceil((visitors * grow) / perDay);
}
