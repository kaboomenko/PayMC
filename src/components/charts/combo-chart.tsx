"use client";

import * as React from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, axisTick } from "./theme";
import { ChartTooltipBox } from "./chart-tooltip";

type Datum = Record<string, string | number | null | undefined>;

/** Bars (left axis) + line (right axis) — e.g. revenue vs peak online. */
export function ComboChart({
  data,
  xKey,
  bar,
  line,
  height = 260,
  formatX = (v) => String(v),
  formatTitle,
  className,
}: {
  data: Datum[];
  xKey: string;
  bar: { key: string; label: string; format: (v: number) => string; color?: string };
  line: { key: string; label: string; format: (v: number) => string; color?: string };
  height?: number;
  formatX?: (v: string | number) => string;
  formatTitle?: (v: string | number) => React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={axisTick} tickFormatter={formatX} minTickGap={24} dy={6} />
          <YAxis yAxisId="l" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={bar.format} width={56} />
          <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={line.format} width={40} />
          <Tooltip
            cursor={{ fill: "rgba(148,166,204,0.05)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltipBox
                  title={formatTitle ? formatTitle(label as string) : formatX(label as string)}
                  rows={payload.map((p) => {
                    const isBar = p.dataKey === bar.key;
                    const cfg = isBar ? bar : line;
                    return {
                      label: cfg.label,
                      value: cfg.format(Number(p.value ?? 0)),
                      color: cfg.color ?? (isBar ? CHART.azureStrong : CHART.ice),
                    };
                  })}
                />
              ) : null
            }
          />
          <Bar yAxisId="l" dataKey={bar.key} fill={bar.color ?? CHART.azureStrong} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey={line.key}
            stroke={line.color ?? CHART.ice}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#05070b", fill: line.color ?? CHART.ice }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
