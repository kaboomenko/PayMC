import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { NavLink } from "./url-nav";

/**
 * «1–30 из 2 205» + prev/next. Server-renderable: hrefs are computed by the
 * page, the links themselves run through the list transition.
 */
export function ListPagination({
  start,
  shown,
  total,
  page,
  pages,
  prevHref,
  nextHref,
  summary,
  className,
}: {
  start: number;
  shown: number;
  total: number;
  page: number;
  pages: number;
  prevHref: string;
  nextHref: string;
  summary?: ReactNode;
  className?: string;
}) {
  if (total === 0) return null;
  const btn =
    "inline-flex size-8 items-center justify-center rounded-md border border-line bg-surface-2 text-fg-2 shadow-raise transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-fg [&_svg]:size-4";
  const off = "pointer-events-none opacity-40";
  return (
    <div className={cn("flex items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5 sm:px-5", className)}>
      <p className="min-w-0 truncate text-[12.5px] text-fg-3">
        <span className="font-mono text-fg-2 nums">
          {formatNumber(start + 1)}–{formatNumber(start + shown)}
        </span>{" "}
        из <span className="font-mono text-fg-2 nums">{formatNumber(total)}</span>
        {summary ? <span className="hidden sm:inline"> · {summary}</span> : null}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="mr-1 hidden font-mono text-[11px] text-fg-4 nums sm:inline">
          стр. {page} / {pages}
        </span>
        {page > 1 ? (
          <NavLink href={prevHref} aria-label="Предыдущая страница" className={btn}>
            <ChevronLeft />
          </NavLink>
        ) : (
          <span aria-hidden className={cn(btn, off)}>
            <ChevronLeft />
          </span>
        )}
        {page < pages ? (
          <NavLink href={nextHref} aria-label="Следующая страница" className={btn}>
            <ChevronRight />
          </NavLink>
        ) : (
          <span aria-hidden className={cn(btn, off)}>
            <ChevronRight />
          </span>
        )}
      </div>
    </div>
  );
}
