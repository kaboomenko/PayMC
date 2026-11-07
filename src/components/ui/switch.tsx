"use client";

import * as React from "react";
import { Switch as S } from "radix-ui";
import { cn } from "@/lib/utils";

export function Switch({ className, size = "md", ...props }: React.ComponentProps<typeof S.Root> & { size?: "sm" | "md" }) {
  return (
    <S.Root
      className={cn(
        "peer relative inline-flex shrink-0 items-center rounded-full border border-line-strong bg-surface-4 transition-colors hover:border-fg-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure-400 data-[state=checked]:border-azure-400/60 data-[state=checked]:bg-azure-500 disabled:opacity-40",
        size === "sm" ? "h-4 w-7" : "h-5 w-9",
        className,
      )}
      {...props}
    >
      <S.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.5)] transition-transform duration-200 ease-[var(--ease-snappy)] data-[state=unchecked]:translate-x-0.5",
          size === "sm" ? "size-3 data-[state=checked]:translate-x-3" : "size-3.5 data-[state=checked]:translate-x-[18px]",
        )}
      />
    </S.Root>
  );
}
