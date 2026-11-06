import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm font-medium leading-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-white/[0.06] text-fg-2 ring-1 ring-inset ring-line",
        azure: "bg-azure-500/12 text-azure-300 ring-1 ring-inset ring-azure-500/25",
        ice: "bg-ice-400/10 text-ice-300 ring-1 ring-inset ring-ice-400/20",
        ok: "bg-ok-soft text-ok ring-1 ring-inset ring-ok/20",
        warn: "bg-warn-soft text-warn ring-1 ring-inset ring-warn/20",
        bad: "bg-bad-soft text-bad ring-1 ring-inset ring-bad/20",
        white: "bg-white text-canvas",
        outline: "text-fg-2 ring-1 ring-inset ring-line-strong",
      },
      size: {
        sm: "h-5 px-1.5 text-[11px]",
        md: "h-6 px-2 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
