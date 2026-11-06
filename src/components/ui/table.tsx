import * as React from "react";
import { cn } from "@/lib/utils";

/** Dense data table primitives. Wrap in <TableWrap> for horizontal scroll on mobile. */
export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative w-full overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full caption-bottom border-collapse text-[13px]", className)} {...props} />;
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-line", className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TR({ className, interactive, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        "border-b border-line-soft transition-colors data-[selected=true]:bg-azure-500/[0.06]",
        interactive && "cursor-pointer hover:bg-white/[0.025]",
        className,
      )}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-9 px-3 text-left align-middle font-mono text-[10.5px] font-medium tracking-[0.07em] whitespace-nowrap text-fg-3 uppercase first:pl-5 last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("h-12 px-3 align-middle text-fg-2 first:pl-5 last:pr-5", className)} {...props} />;
}
