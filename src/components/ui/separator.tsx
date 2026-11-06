import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(orientation === "horizontal" ? "h-px w-full" : "h-full w-px", "shrink-0 bg-line", className)}
    />
  );
}
