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

const thousands = (v: number) => (v >= 1000 ? `${formatNumber(Math.round(v / 1000))} тыс` : formatNumber(v));

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
