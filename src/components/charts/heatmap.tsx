"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** 7×24 activity heatmap (rows = Mon..Sun, cols = hours MSK). */
export function Heatmap({
  data,
  format = (v) => String(v),
  className,
}: {
  data: number[][];
  format?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(...data.flat(), 1);
  const [hover, setHover] = React.useState<{ d: number; h: number } | null>(null);
  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-[28px_1fr] gap-x-2">
        <div />
        <div className="mb-1.5 grid grid-cols-24 font-mono text-[9.5px] text-fg-4" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
          {Array.from({ length: 24 }).map((_, h) => (
            <span key={h} className="text-center">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
        </div>
        {data.map((row, d) => (
          <React.Fragment key={d}>
            <span className="flex items-center font-mono text-[10px] text-fg-4">{DAYS[d]}</span>
            <div className="grid gap-[3px] py-[1.5px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
              {row.map((v, h) => {
                const t = v / max;
                const isHover = hover?.d === d && hover?.h === h;
                return (
                  <button
                    type="button"
                    key={h}
                    aria-label={`${DAYS[d]} ${h}:00 — ${format(v)}`}
                    onMouseEnter={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover({ d, h })}
                    onBlur={() => setHover(null)}
                    className={cn("aspect-square w-full rounded-[3px] transition-[outline] outline-offset-1", isHover && "outline outline-1 outline-white/60")}
                    style={{
                      background:
                        t < 0.04
                          ? "rgba(148,166,204,0.05)"
                          : `color-mix(in oklab, #3377ff ${Math.round(18 + t * 70)}%, ${t > 0.82 ? "#86e0ff" : "#0a0d14"})`,
                    }}
                  />
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-fg-4">
        <span className="font-mono">
          {hover ? `${DAYS[hover.d]}, ${String(hover.h).padStart(2, "0")}:00–${String((hover.h + 1) % 24).padStart(2, "0")}:00 · ${format(data[hover.d][hover.h])}` : "Наведите на ячейку"}
        </span>
        <span className="flex items-center gap-1.5">
          меньше
          {[0.1, 0.35, 0.6, 0.85, 1].map((t) => (
            <span
              key={t}
              className="size-2.5 rounded-[2px]"
              style={{ background: `color-mix(in oklab, #3377ff ${Math.round(18 + t * 70)}%, ${t > 0.82 ? "#86e0ff" : "#0a0d14"})` }}
            />
          ))}
          больше
        </span>
      </div>
    </div>
  );
}
