import * as React from "react";
import { cn } from "@/lib/utils";

/** Standard dashboard page header: title, one-line description, actions. */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** small line above the title, e.g. breadcrumb-ish context or status */
  meta?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {meta ? <div className="mb-2 flex items-center gap-2 text-xs text-fg-3">{meta}</div> : null}
          <h1 className="truncate text-[26px] leading-tight font-medium tracking-[-0.025em] text-fg">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-fg-3">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Section title inside a page */
export function SectionTitle({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="text-[15px] font-medium text-fg">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-fg-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
