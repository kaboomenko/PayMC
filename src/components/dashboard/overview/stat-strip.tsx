import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Change } from "./bits";

/**
 * One KPI strip for the whole dashboard (analytics, players, player profile):
 * joined cells with hairlines, sentence-case label, mono tabular value,
 * optional change and a short sub line. Server-renderable.
 *
 * Hairlines: every cell draws its own top + left border and the grid is pulled
 * 1px up/left under the rounded frame, so the outer edge never doubles and any
 * column count (2 → 3 → 5) works without per-breakpoint border rules.
 */
export function StatStrip({ cols, className, children }: { cols: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-surface shadow-raise", className)}>
      <dl className={cn("-mt-px -ml-px grid", cols)}>{children}</dl>
    </div>
  );
}

/** Label / value classes shared with the overview KPI cards. */
export const STAT_LABEL = "text-[12.5px] leading-snug text-fg-3";
export const STAT_VALUE = "font-mono text-[20px] leading-none font-semibold tracking-[-0.03em] text-fg nums sm:text-[24px]";

/** Phone: two lines reserved so values in a row stay aligned; wider: one line with an ellipsis. */
const LABEL_FIT = "line-clamp-2 min-h-[2.5em] sm:line-clamp-1 sm:min-h-0";

export function Stat({
  label,
  hint,
  value,
  delta,
  sub,
  className,
}: {
  label: ReactNode;
  /** what the number means — shown on hover/focus of the label */
  hint?: ReactNode;
  value: ReactNode;
  delta?: { value: number; unit?: "pct" | "pp"; invert?: boolean };
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 border-t border-l border-line-soft px-4 py-3.5 sm:px-5 sm:py-4", className)}>
      <dt className="min-w-0">
        {hint ? (
          <Tooltip content={hint}>
            <span
              tabIndex={0}
              className={cn(
                STAT_LABEL,
                LABEL_FIT,
                "w-fit max-w-full cursor-help decoration-fg-4 decoration-dotted underline-offset-4 outline-none hover:underline focus-visible:underline",
              )}
            >
              {label}
            </span>
          </Tooltip>
        ) : (
          <span className={cn(STAT_LABEL, LABEL_FIT, "max-w-full")}>{label}</span>
        )}
      </dt>
      <dd className={cn("mt-2", STAT_VALUE)}>{value}</dd>
      {delta || sub ? (
        <dd className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] leading-snug text-fg-3">
          {delta ? <Change value={delta.value} unit={delta.unit} invert={delta.invert} className="shrink-0" /> : null}
          {sub ? <span className="min-w-0">{sub}</span> : null}
        </dd>
      ) : null}
    </div>
  );
}
