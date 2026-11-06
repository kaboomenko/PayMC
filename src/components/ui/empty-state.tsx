import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="relative mb-4 flex size-11 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-3 [&_svg]:size-5">
          <span className="relative">{icon}</span>
        </div>
      ) : null}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] text-fg-3">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
