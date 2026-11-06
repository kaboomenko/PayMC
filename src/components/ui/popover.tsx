"use client";

import * as React from "react";
import { Popover as P } from "radix-ui";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;
export const PopoverClose = P.Close;

export function PopoverContent({ className, sideOffset = 8, align = "center", ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 w-72 rounded-lg border border-line-strong bg-surface-2 p-3 text-sm text-fg shadow-pop outline-none data-[state=open]:animate-[fade-up_0.14s_var(--ease-snappy)]",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}
