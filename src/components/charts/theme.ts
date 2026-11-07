/** Chart palette & axis styling — keep every chart in the product consistent. */
export const CHART = {
  azure: "#5c98ff",
  azureStrong: "#3377ff",
  ice: "#55cfff",
  white: "#edf1f8",
  muted: "#475166",
  ok: "#3fd18f",
  warn: "#f3b84d",
  bad: "#f2616f",
  grid: "rgba(148,166,204,0.07)",
  axis: "#566177",
  /** categorical sequence for donuts / stacked series (blue family first) */
  series: ["#3377ff", "#55cfff", "#8cb9ff", "#edf1f8", "#1b4cc4", "#86e0ff", "#475166", "#0e93c4"],
} as const;

export const axisTick = {
  fill: CHART.axis,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
} as const;

/**
 * Round axis scale: 4 steps of 1/2/2.5/5 × 10^k that cover `max`.
 * Avoids Recharts' auto ticks like 9 500 / 19 000 / 28 500 (rendered as «29 тыс»).
 */
export function niceScale(max: number, steps = 4): { domain: [number, number]; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { domain: [0, 1], ticks: [0, 1] };
  const raw = max / steps;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s * steps >= max) ?? 10 * pow;
  const top = step * steps;
  return { domain: [0, top], ticks: Array.from({ length: steps + 1 }, (_, i) => Math.round(i * step * 1000) / 1000) };
}

export function maxOf<T extends Record<string, unknown>>(data: T[], keys: string[]) {
  let m = 0;
  for (const d of data) for (const k of keys) {
    const v = Number(d[k]);
    if (Number.isFinite(v) && v > m) m = v;
  }
  return m;
}
