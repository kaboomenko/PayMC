import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  tone = "azure",
  className,
  size = "md",
}: {
  value: number;
  max?: number;
  tone?: "azure" | "ice" | "ok" | "warn" | "bad" | "white";
  className?: string;
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = {
    azure: "bg-azure-500",
    ice: "bg-ice-400",
    ok: "bg-ok",
    warn: "bg-warn",
    bad: "bg-bad",
    white: "bg-white",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      className={cn("relative w-full overflow-hidden rounded-full bg-white/[0.06]", size === "sm" ? "h-1" : "h-1.5", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}
