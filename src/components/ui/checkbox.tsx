"use client";

import * as React from "react";
import { Checkbox as C } from "radix-ui";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "peer flex size-4 shrink-0 items-center justify-center rounded-xs border border-line-strong bg-surface-2 transition-colors hover:border-fg-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure-400 data-[state=checked]:border-azure-500 data-[state=checked]:bg-azure-500 data-[state=indeterminate]:border-azure-500 data-[state=indeterminate]:bg-azure-500 disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <C.Indicator className="text-white">
        {props.checked === "indeterminate" ? <Minus className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
      </C.Indicator>
    </C.Root>
  );
}
