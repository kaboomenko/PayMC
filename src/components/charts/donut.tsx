"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART } from "./theme";
import { ChartTooltipBox } from "./chart-tooltip";
import { cn } from "@/lib/utils";

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

export function Donut({
  data,
  size = 168,
  thickness = 18,
  format = (v) => String(v),
  center,
  className,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  format?: (v: number) => string;
  center?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltipBox
                  rows={[
                    {
                      label: String(payload[0].name),
                      value: format(Number(payload[0].value ?? 0)),
                      color: (payload[0].payload as DonutDatum).color,
                    },
                  ]}
                />
              ) : null
            }
          />
          <Pie
            data={data.map((d, i) => ({ ...d, color: d.color ?? CHART.series[i % CHART.series.length] }))}
            dataKey="value"
            nameKey="label"
            innerRadius={size / 2 - thickness}
            outerRadius={size / 2}
            paddingAngle={1.5}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={d.label} fill={d.color ?? CHART.series[i % CHART.series.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center ? <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div> : null}
    </div>
  );
}

/** Legend list next to a donut / stacked bar */
export function ChartLegend({
  items,
  format = (v) => String(v),
  className,
}: {
  items: DonutDatum[];
  format?: (v: number) => string;
  className?: string;
}) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((it, i) => (
        <li key={it.label} className="flex items-center gap-2.5 text-[13px]">
          <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: it.color ?? CHART.series[i % CHART.series.length] }} />
          <span className="flex-1 truncate text-fg-2">{it.label}</span>
          <span className="font-mono text-xs text-fg-3 nums">{Math.round((it.value / total) * 1000) / 10}%</span>
          <span className="w-20 text-right font-mono text-xs text-fg nums">{format(it.value)}</span>
        </li>
      ))}
    </ul>
  );
}
