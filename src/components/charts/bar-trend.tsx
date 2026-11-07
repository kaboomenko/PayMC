"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, axisTick, maxOf, niceScale } from "./theme";
import { ChartTooltipBox } from "./chart-tooltip";

type Datum = Record<string, string | number | null | undefined>;

export function BarTrend({
  data,
  xKey,
  yKey,
  label,
  color = CHART.azureStrong,
  height = 220,
  formatX = (v) => String(v),
  formatY = (v) => String(v),
  formatTitle,
  highlightLast = false,
  showYAxis = true,
  className,
}: {
  data: Datum[];
  xKey: string;
  yKey: string;
  label: string;
  color?: string;
  height?: number;
  formatX?: (v: string | number) => string;
  formatY?: (v: number) => string;
  formatTitle?: (v: string | number) => React.ReactNode;
  highlightLast?: boolean;
  showYAxis?: boolean;
  className?: string;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const scale = niceScale(maxOf(data, [yKey]));
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: showYAxis ? 0 : 4 }}
          onMouseMove={(s) => setActive(typeof s?.activeTooltipIndex === "number" ? s.activeTooltipIndex : null)}
          onMouseLeave={() => setActive(null)}
        >
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={axisTick} tickFormatter={formatX} minTickGap={20} dy={6} />
          {showYAxis ? <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={formatY} width={56} domain={scale.domain} ticks={scale.ticks} /> : <YAxis hide domain={scale.domain} />}
          <Tooltip
            cursor={{ fill: "rgba(148,166,204,0.05)" }}
            content={({ active: a, payload, label: l }) =>
              a && payload?.length ? (
                <ChartTooltipBox
                  title={formatTitle ? formatTitle(l as string) : formatX(l as string)}
                  rows={[{ label, value: formatY(Number(payload[0].value ?? 0)), color }]}
                />
              ) : null
            }
          />
          <Bar dataKey={yKey} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {data.map((_, i) => {
              const isLast = i === data.length - 1;
              const dim = active !== null && active !== i;
              return (
                <Cell
                  key={i}
                  fill={color}
                  fillOpacity={dim ? 0.45 : highlightLast && !isLast && active === null ? 0.5 : 1}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
