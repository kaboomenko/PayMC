"use client";

import { ComboChart } from "@/components/charts";
import { formatNumber } from "@/lib/format";

export interface RevenuePoint {
  /** "6 ноя" */
  day: string;
  /** "пт, 6 ноября" */
  title: string;
  revenue: number;
  online: number;
}

/** Axis/tooltip label: 20 000 → «20 тыс», 2 500 → «2,5 тыс» (never rounds a tick into a wrong label). */
const thousands = (v: number) => (v >= 1000 ? `${formatNumber(v / 1000, v % 1000 === 0 ? 0 : 1)}\u00a0тыс` : formatNumber(v));

/** Revenue bars vs peak online line — formatters live here because functions can't cross the server boundary. */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const titles = new Map(data.map((d) => [d.day, d.title]));
  return (
    <ComboChart
      data={data as unknown as Record<string, string | number>[]}
      xKey="day"
      height={280}
      bar={{ key: "revenue", label: "Выручка", format: thousands }}
      line={{ key: "online", label: "Пиковый онлайн", format: (v) => formatNumber(v) }}
      formatTitle={(v) => titles.get(String(v)) ?? String(v)}
    />
  );
}
