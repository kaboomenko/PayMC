"use client";

import * as React from "react";
import { Tooltip as T } from "radix-ui";
import { cn } from "@/lib/utils";

export const TooltipProvider = T.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delay = 200,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delay?: number;
  className?: string;
}) {
  return (
    <T.Provider delayDuration={delay}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            side={side}
            align={align}
            sideOffset={6}
            className={cn(
              "z-[60] max-w-64 rounded-md border border-line-strong bg-surface-3 px-2 py-1.5 text-xs leading-snug text-fg-2 shadow-pop data-[state=delayed-open]:animate-[fade-up_0.15s_var(--ease-snappy)]",
              className,
            )}
          >
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
