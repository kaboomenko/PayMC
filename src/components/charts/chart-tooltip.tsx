"use client";

import * as React from "react";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Shared tooltip body used by all Recharts charts. */
export function ChartTooltipBox({ title, rows }: { title?: React.ReactNode; rows: TooltipRow[] }) {
  return (
    <div className="min-w-40 rounded-md border border-line-strong bg-surface-3/95 px-3 py-2 shadow-pop backdrop-blur-sm">
      {title ? <p className="mb-1.5 label-mono text-fg-3">{title}</p> : null}
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-fg-2">
              {r.color ? <span className="size-2 rounded-[2px]" style={{ background: r.color }} /> : null}
              {r.label}
            </span>
            <span className="font-mono font-medium text-fg nums">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
