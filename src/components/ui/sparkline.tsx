import * as React from "react";
import { cn } from "@/lib/utils";

/** Tiny dependency-free SVG sparkline. Server-safe. */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  tone = "azure",
  fill = true,
  className,
  strokeWidth = 1.5,
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: "azure" | "ice" | "ok" | "bad" | "muted";
  fill?: boolean;
  className?: string;
  strokeWidth?: number;
}) {
  const id = React.useId();
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const color = {
    azure: "#5c98ff",
    ice: "#55cfff",
    ok: "#3fd18f",
    bad: "#f2616f",
    muted: "#6c788d",
  }[tone];
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible", className)} aria-hidden>
      {fill ? (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={`url(#${id})`} />
        </>
      ) : null}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.25} fill={color} />
    </svg>
  );
}
