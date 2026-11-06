import * as React from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-strong bg-surface-3 px-1 font-mono text-[10.5px] leading-none text-fg-2 shadow-[inset_0_-1px_0_rgb(0_0_0/0.4)]",
        className,
      )}
      {...props}
    />
  );
}
