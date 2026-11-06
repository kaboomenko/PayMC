"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

/** Compact segmented control — period switchers, view modes. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "sm",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  size?: "xs" | "sm";
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 [&_svg]:size-3.5",
              size === "xs" ? "h-6 px-2 text-[11.5px]" : "h-7 px-2.5 text-[12.5px]",
              active ? "bg-surface-4 text-fg shadow-raise" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
