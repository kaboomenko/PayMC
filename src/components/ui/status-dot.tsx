import { cn } from "@/lib/utils";

const tones = {
  ok: "bg-ok text-ok",
  warn: "bg-warn text-warn",
  bad: "bg-bad text-bad",
  azure: "bg-azure-400 text-azure-400",
  ice: "bg-ice-400 text-ice-400",
  idle: "bg-fg-4 text-fg-4",
} as const;

export type StatusTone = keyof typeof tones;

export function StatusDot({
  tone = "ok",
  pulse = false,
  className,
}: {
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", tones[tone], pulse && "animate-pulse-dot", className)}
    />
  );
}
