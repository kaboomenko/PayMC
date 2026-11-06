import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

/** +12,4 % ↗ — period-over-period change. `invert` for metrics where down is good (refunds). */
export function Delta({ value, invert = false, className }: { value: number; invert?: boolean; className?: string }) {
  const positive = value >= 0;
  const good = invert ? !positive : positive;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono text-[11.5px] font-medium nums", good ? "text-ok" : "text-bad", className)}>
      <Icon className="size-3.5" />
      {formatPercent(Math.abs(value))}
    </span>
  );
}
