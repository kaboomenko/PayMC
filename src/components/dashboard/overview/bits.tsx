import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/lib/format";
import { Delta } from "@/components/ui/delta";

/**
 * Period-over-period change. Relative changes reuse the shared <Delta>;
 * rates (conversion, refund share) change in percentage points.
 */
export function Change({
  value,
  unit = "pct",
  invert = false,
  className,
}: {
  value: number;
  unit?: "pct" | "pp";
  invert?: boolean;
  className?: string;
}) {
  if (unit === "pct") return <Delta value={value} invert={invert} className={className} />;
  const positive = value >= 0;
  const good = invert ? !positive : positive;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono text-[11.5px] font-medium nums", good ? "text-ok" : "text-bad", className)}>
      <Icon className="size-3.5" />
      {formatNumber(Math.abs(value), Math.abs(value) < 10 ? 1 : 0)}&nbsp;п.п.
    </span>
  );
}

/** Legend rows with ru-RU percent formatting (the shared ChartLegend prints "52.3%"). */
export function ShareLegend({
  items,
  format,
  showValue = true,
  className,
}: {
  items: { label: string; value: number; color: string; meta?: React.ReactNode }[];
  format: (v: number) => string;
  /** false — label and share only (the value stays in the row tooltip) */
  showValue?: boolean;
  className?: string;
}) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2.5 text-[13px]" title={`${it.label}: ${format(it.value)}`}>
          <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: it.color }} />
          <span className="min-w-0 flex-1 truncate text-fg-2">
            {it.label}
            {it.meta ? <span className="ml-1.5 text-[11.5px] text-fg-4">{it.meta}</span> : null}
          </span>
          <span className="w-12 text-right font-mono text-[11.5px] text-fg-3 nums">{formatPercent((it.value / total) * 100)}</span>
          {showValue ? <span className="w-[76px] text-right font-mono text-[12px] text-fg nums">{format(it.value)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Card section header: small title + optional meta + actions on the right. */
export function PanelHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-12 items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5 sm:px-5", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <h2 className="truncate text-[13.5px] font-medium text-fg">{title}</h2>
        {meta ? <div className="flex min-w-0 items-center gap-2 text-xs text-fg-3">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

/**
 * Y-axis money ticks: 0 · 750 · 2,5 тыс · 25 тыс. Never rounds a tick to a
 * neighbour value (28 500 stays «28,5 тыс», not «29 тыс»).
 */
export function axisMoney(v: number) {
  if (v === 0) return "0";
  if (Math.abs(v) >= 1000) return `${formatNumber(v / 1000, v % 1000 === 0 ? 0 : 1)} тыс`;
  return formatNumber(v);
}
