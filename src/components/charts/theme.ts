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
  fontSize: 10.5,
  fontFamily: "var(--font-mono)",
} as const;
