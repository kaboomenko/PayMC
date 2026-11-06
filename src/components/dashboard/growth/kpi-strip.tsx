import * as React from "react";
import { cn } from "@/lib/utils";

export interface KpiItem {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** right-aligned slot next to the value: sparkline, delta, tiny meter */
  accent?: React.ReactNode;
}

/**
 * One hairline-divided strip of 2–4 key numbers. Server-safe.
 * 2 columns on phones, a single row from `lg`.
 */
export function KpiStrip({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-raise lg:grid-cols-4",
        className,
      )}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          className={cn(
            "relative flex min-w-0 flex-col gap-2 border-line-soft px-4 py-3.5 sm:px-5 sm:py-4",
            i % 2 === 1 && "border-l",
            i >= 2 && "border-t lg:border-t-0",
            i === 2 && "lg:border-l",
          )}
        >
          <p className="label-mono text-fg-3 lg:truncate">{it.label}</p>
          <div className="mt-auto flex min-h-7 items-end justify-between gap-3">
            <p className="truncate font-mono text-[20px] leading-none font-medium tracking-[-0.02em] text-fg nums sm:text-[22px]">
              {it.value}
            </p>
            {it.accent ? <div className="hidden shrink-0 sm:block">{it.accent}</div> : null}
          </div>
          {it.sub ? <p className="line-clamp-2 text-xs leading-snug text-fg-3 lg:truncate">{it.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

/** Small muted unit after a big number: 171 830 <Unit>₽</Unit> */
export function Unit({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("ml-1 text-[0.64em] font-normal tracking-normal text-fg-3", className)}>{children}</span>;
}
