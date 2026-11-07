import * as React from "react";
import { formatDateShort, formatNumber } from "@/lib/format";

/**
 * Two-line chart for an A/B test with an auto-scaled domain — the gap between
 * variants is the story, so the axis does not start at zero. Server-safe SVG.
 */
export function VariantChart({
  data,
  height = 150,
  labels = ["A", "B"],
}: {
  data: { day: number; a: number; b: number }[];
  height?: number;
  labels?: [string, string];
}) {
  if (data.length < 2) return null;
  const W = 400;
  const H = height;
  const values = data.flatMap((d) => [d.a, d.b]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.18 || 1;
  const min = lo - pad;
  const max = hi + pad;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const path = (k: "a" | "b") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(" ");
  const ticks = [0.2, 0.5, 0.8].map((t) => min + (max - min) * t);
  const last = data[data.length - 1];

  return (
    <div className="relative" style={{ height: height + 18 }}>
      <div className="absolute inset-y-0 left-0 w-10" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="absolute right-1 -translate-y-1/2 font-mono text-[11px] text-fg-4 nums" style={{ top: y(t) }}>
            {formatNumber(t, 1)}
          </span>
        ))}
      </div>
      <div className="absolute top-0 right-14 left-10" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label={`Накопительная выручка на посетителя: ${labels[0]} и ${labels[1]}`}>
          {ticks.map((t) => (
            <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} stroke="rgba(148,166,204,0.08)" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={path("a")} fill="none" stroke="#7c889d" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={path("b")} fill="none" stroke="#55cfff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ice-400 ring-2 ring-surface" style={{ left: "100%", top: y(last.b) }} />
        <span className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg-3 ring-2 ring-surface" style={{ left: "100%", top: y(last.a) }} />
      </div>
      <div className="absolute top-0 right-0 w-12" style={{ height }} aria-hidden>
        <span className="absolute left-1 -translate-y-1/2 font-mono text-[11px] text-ice-300 nums" style={{ top: y(last.b) }}>
          {formatNumber(last.b, 2)}
        </span>
        <span className="absolute left-1 -translate-y-1/2 font-mono text-[11px] text-fg-3 nums" style={{ top: y(last.a) }}>
          {formatNumber(last.a, 2)}
        </span>
      </div>
      <div className="absolute right-14 bottom-0 left-10 flex justify-between font-mono text-[11px] text-fg-4" aria-hidden>
        <span>{formatDateShort(data[0].day)}</span>
        <span>{formatDateShort(data[Math.floor(data.length / 2)].day)}</span>
        <span>{formatDateShort(last.day)}</span>
      </div>
    </div>
  );
}
