"use client";

import * as React from "react";
import { Tabs as T } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;

/**
 * variant="underline" — page-level sections (default)
 * variant="pill" — compact segmented switcher inside cards
 */
export function TabsList({
  className,
  variant = "underline",
  ...props
}: React.ComponentProps<typeof T.List> & { variant?: "underline" | "pill" }) {
  return (
    <T.List
      data-variant={variant}
      className={cn(
        "group/tabs flex items-center",
        variant === "underline" && "gap-5 border-b border-line",
        variant === "pill" && "inline-flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "relative inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-fg-3 transition-colors hover:text-fg-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure-400 data-[state=active]:text-fg [&_svg]:size-4",
        // underline
        "group-data-[variant=underline]/tabs:h-10 group-data-[variant=underline]/tabs:after:absolute group-data-[variant=underline]/tabs:after:inset-x-0 group-data-[variant=underline]/tabs:after:-bottom-px group-data-[variant=underline]/tabs:after:h-px group-data-[variant=underline]/tabs:after:bg-transparent group-data-[variant=underline]/tabs:data-[state=active]:after:bg-fg",
        // pill
        "group-data-[variant=pill]/tabs:h-7 group-data-[variant=pill]/tabs:rounded-md group-data-[variant=pill]/tabs:px-2.5 group-data-[variant=pill]/tabs:data-[state=active]:bg-surface-4 group-data-[variant=pill]/tabs:data-[state=active]:shadow-raise",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("outline-none", className)} {...props} />;
}
