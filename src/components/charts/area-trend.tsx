"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, axisTick, maxOf, niceScale } from "./theme";
import { ChartTooltipBox } from "./chart-tooltip";

export interface Series {
  key: string;
  label: string;
  color?: string;
  /** dashed line without fill — e.g. previous period */
  dashed?: boolean;
  fill?: boolean;
}

type Datum = Record<string, string | number | null | undefined>;

export function AreaTrend({
  data,
  xKey,
  series,
  height = 240,
  formatX = (v) => String(v),
  formatY = (v) => String(v),
  formatValue,
  formatTitle,
  showYAxis = true,
  className,
}: {
  data: Datum[];
  xKey: string;
  series: Series[];
  height?: number;
  formatX?: (v: string | number) => string;
  formatY?: (v: number) => string;
  formatValue?: (v: number, key: string) => string;
  formatTitle?: (v: string | number) => React.ReactNode;
  showYAxis?: boolean;
  className?: string;
}) {
  const uid = React.useId().replace(/:/g, "");
  const scale = niceScale(maxOf(data, series.map((s) => s.key)));
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: showYAxis ? 0 : 4 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color ?? CHART.azure} stopOpacity={0.26} />
                <stop offset="100%" stopColor={s.color ?? CHART.azure} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickFormatter={formatX}
            minTickGap={28}
            dy={6}
          />
          {showYAxis ? (
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={formatY} width={56} domain={scale.domain} ticks={scale.ticks} />
          ) : (
            <YAxis hide />
          )}
          <Tooltip
            cursor={{ stroke: "rgba(148,166,204,0.25)", strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltipBox
                  title={formatTitle ? formatTitle(label as string) : formatX(label as string)}
                  rows={payload.map((p) => {
                    const s = series.find((x) => x.key === p.dataKey);
                    const v = Number(p.value ?? 0);
                    return {
                      label: s?.label ?? String(p.dataKey),
                      value: formatValue ? formatValue(v, String(p.dataKey)) : formatY(v),
                      color: s?.color ?? CHART.azure,
                    };
                  })}
                />
              ) : null
            }
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color ?? CHART.azure}
              strokeWidth={s.dashed ? 1.25 : 1.75}
              strokeDasharray={s.dashed ? "4 4" : undefined}
              fill={s.dashed || s.fill === false ? "transparent" : `url(#${uid}-${s.key})`}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#05070b", fill: s.color ?? CHART.azure }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
