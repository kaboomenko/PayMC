"use client";

import { BarTrend } from "@/components/charts";
import { formatMoney, formatMoneyCompact } from "@/lib/format";

/** Monthly spend Jun–Nov. Formatters live here because functions can't cross the server boundary. */
export function PlayerSpendChart({ data }: { data: { month: string; full: string; spend: number }[] }) {
  const full = new Map(data.map((d) => [d.month, d.full]));
  return (
    <BarTrend
      data={data}
      xKey="month"
      yKey="spend"
      label="Потратил"
      height={200}
      highlightLast
      formatY={(v) => (v >= 10_000 ? formatMoneyCompact(v) : formatMoney(v))}
      formatTitle={(v) => `${full.get(String(v)) ?? v}`}
    />
  );
}
